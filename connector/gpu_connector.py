"""MINDSource NVIDIA GPU connector.

Collects real GPU telemetry from `nvidia-smi` on this machine and pushes it to
the MINDSource FastAPI backend on a fixed interval.

Data flow:
    get_gpu_telemetry()   # run nvidia-smi, parse rows
          v
    normalize_telemetry() # build the MINDSource telemetry contract
          v
    send_telemetry()      # HTTP POST to the backend
          v
    poll_loop()           # repeat forever, tolerant of failures

------------------------------------------------------------------------------
SECURITY (read this):
  * Telemetry flow is OUTBOUND ONLY: the connector sends data to MINDSource and
    never receives or executes commands from the backend. There is no remote
    command execution path here — the backend cannot run anything on this host.
  * It sends data ONLY to the single configured backend URL (config.API_URL).
  * It runs ONE fixed, read-only nvidia-smi query for a fixed set of GPU fields.
    It does not read files, environment secrets, credentials, or passwords, and
    it never uploads arbitrary files.
  * The nvidia-smi arguments are a hardcoded constant list (no shell, no
    user/network-controlled input), so there is no command-injection surface.
  * HTTP localhost is fine for a local hackathon demo. For production, set
    MINDSOURCE_API_URL to an https:// URL — no code change required.

This connector is the first implementation of the MINDSource telemetry adapter
model. Future connectors (Kubernetes, Slurm, cloud) can emit the same contract.
Only the NVIDIA/local-GPU connector is implemented here.
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mindsource.connector")

# Fixed, read-only query. These are the only fields we collect.
_NVIDIA_SMI_ARGS = [
    "nvidia-smi",
    "--query-gpu=index,name,memory.total,memory.used,memory.free,"
    "utilization.gpu,temperature.gpu",
    "--format=csv,noheader,nounits",
]


class NvidiaSmiError(RuntimeError):
    """Raised when nvidia-smi is missing or returns an error."""


def get_gpu_telemetry() -> list[dict]:
    """Run nvidia-smi and return one dict per GPU. Raises NvidiaSmiError on failure."""
    try:
        result = subprocess.run(
            _NVIDIA_SMI_ARGS,
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
    except FileNotFoundError as exc:
        raise NvidiaSmiError(
            "nvidia-smi not found on PATH — is an NVIDIA driver installed?"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise NvidiaSmiError("nvidia-smi timed out") from exc
    except subprocess.CalledProcessError as exc:
        raise NvidiaSmiError(
            f"nvidia-smi exited with code {exc.returncode}: {exc.stderr.strip()}"
        ) from exc

    return _parse_csv(result.stdout)


def _parse_csv(raw: str) -> list[dict]:
    """Parse nvidia-smi CSV (noheader,nounits) into telemetry dicts, safely."""
    gpus: list[dict] = []
    for line in raw.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 7:
            log.warning("Skipping unexpected nvidia-smi row: %r", line)
            continue
        try:
            gpus.append(
                {
                    "index": int(parts[0]),
                    "name": parts[1],
                    "memory_total_mb": int(float(parts[2])),
                    "memory_used_mb": int(float(parts[3])),
                    "memory_free_mb": int(float(parts[4])),
                    "utilization_percent": int(float(parts[5])),
                    "temperature_c": _safe_int(parts[6]),
                }
            )
        except (ValueError, IndexError) as exc:
            log.warning("Skipping unparseable nvidia-smi row %r (%s)", line, exc)
    return gpus


def _safe_int(value: str) -> int | None:
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None  # some GPUs report "N/A" for temperature


def normalize_telemetry(gpus: list[dict]) -> dict:
    """Wrap parsed GPU rows in the MINDSource telemetry contract."""
    return {
        "source": config.SOURCE,
        "node_id": config.NODE_ID,
        "hostname": config.HOSTNAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gpus": gpus,
    }


def send_telemetry(payload: dict) -> bool:
    """POST telemetry to the backend. Returns True on success, False otherwise.

    Never raises for connection/backend errors — the caller keeps polling.
    """
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        config.telemetry_url(),
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(
            request, timeout=config.REQUEST_TIMEOUT_SECONDS
        ) as response:
            if 200 <= response.status < 300:
                return True
            log.warning("Backend returned HTTP %s", response.status)
            return False
    except urllib.error.HTTPError as exc:
        # Backend reachable but rejected the payload (e.g. validation 422).
        detail = exc.read().decode("utf-8", "replace")[:300]
        log.warning("Backend rejected telemetry (HTTP %s): %s", exc.code, detail)
        return False
    except urllib.error.URLError as exc:
        # Backend unreachable — expected while it is starting/stopped.
        log.warning("Backend unavailable (%s) — will retry", exc.reason)
        return False
    except TimeoutError:
        log.warning("Telemetry request timed out — will retry")
        return False


def poll_loop() -> None:
    """Poll nvidia-smi and push telemetry forever; tolerate transient failures."""
    log.info("MINDSource NVIDIA connector starting")
    log.info("  node_id : %s", config.NODE_ID)
    log.info("  hostname: %s", config.HOSTNAME)
    log.info("  target  : %s", config.telemetry_url())
    log.info("  interval: %ss", config.POLL_INTERVAL_SECONDS)

    connected: bool | None = None  # track transitions to reduce log noise
    while True:
        try:
            gpus = get_gpu_telemetry()
        except NvidiaSmiError as exc:
            log.error("GPU telemetry unavailable: %s", exc)
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        if not gpus:
            log.warning("nvidia-smi returned no GPUs")
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        payload = normalize_telemetry(gpus)
        ok = send_telemetry(payload)

        if ok and connected is not True:
            log.info("Connected — telemetry accepted by MINDSource backend")
            connected = True
        elif not ok and connected is not False:
            log.info("Disconnected — backend unavailable, retrying every %ss",
                     config.POLL_INTERVAL_SECONDS)
            connected = False

        if ok:
            summary = ", ".join(
                f"GPU{g['index']} {g['utilization_percent']}% "
                f"{g['memory_used_mb']}/{g['memory_total_mb']}MB"
                for g in gpus
            )
            log.info("Sent telemetry: %s", summary)

        time.sleep(config.POLL_INTERVAL_SECONDS)


def main() -> int:
    try:
        poll_loop()
    except KeyboardInterrupt:
        log.info("Connector stopped by user")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
