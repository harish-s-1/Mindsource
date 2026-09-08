"""MINDSource node agent (Phase 4).

Extends the telemetry connector with a *pull-based* execution agent. On each
cycle it:
  1. sends real nvidia-smi telemetry (reusing gpu_connector), and
  2. asks the backend for a job assigned to THIS node_id; if one exists, it runs
     the predefined workload locally and reports state back.

------------------------------------------------------------------------------
SECURITY (read this):
  * OUTBOUND ONLY. The agent opens NO server and accepts NO inbound connections
    or commands. It only calls the configured backend URL.
  * It runs ONLY an allowlist of predefined, self-contained GPU workloads
    (gpu_benchmark / matrix_multiply / cuda_stress). The backend can never make
    it run an arbitrary command — the only value taken from a job is an integer
    duration. There is no shell, no eval, no remote code.
  * Real GPU load requires PyTorch + CUDA on this machine. If unavailable, the
    agent runs a CPU fallback and reports device="cpu" honestly (never a fake
    GPU claim).

Run on each machine (same code, per-machine config):
    MINDSOURCE_NODE_ID=harish-rtx3050  MINDSOURCE_API_URL=http://<backend>:8000 \
        python node_agent.py
"""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request

import config
import gpu_connector as gc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mindsource.agent")

# Allowlist — mirrored on the backend. A job's workload_type MUST be one of these.
ALLOWED_WORKLOADS = frozenset({"gpu_benchmark", "matrix_multiply", "cuda_stress"})


def _post(url: str, payload: dict) -> dict | None:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, method="POST", headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=config.REQUEST_TIMEOUT_SECONDS) as r:
            if 200 <= r.status < 300:
                return json.loads(r.read().decode("utf-8"))
            log.warning("Backend HTTP %s from %s", r.status, url)
    except urllib.error.URLError as exc:
        log.warning("Backend unavailable (%s) — will retry", getattr(exc, "reason", exc))
    except Exception as exc:  # noqa: BLE001
        log.warning("Request error: %s", exc)
    return None


def _report(execution_id: str, state: str, **fields) -> None:
    _post(config.update_url(), {"execution_id": execution_id, "state": state, **fields})


def _send_telemetry_safe() -> None:
    try:
        gpus = gc.get_gpu_telemetry()
        if gpus:
            gc.send_telemetry(gc.normalize_telemetry(gpus))
    except gc.NvidiaSmiError as exc:
        log.warning("Telemetry unavailable: %s", exc)


# --- Predefined workloads (no shell, no external input) --------------------
def _run_matmul(duration_seconds: int) -> str:
    """Run a matmul stress loop for the duration. Uses CUDA when available.

    Returns the device actually used: "cuda", "cpu (numpy)" or "cpu (python)".
    """
    deadline = time.time() + max(1, duration_seconds)
    # Preferred: real GPU load via PyTorch + CUDA.
    try:
        import torch  # type: ignore

        if torch.cuda.is_available():
            dev = torch.device("cuda")
            a = torch.randn(2048, 2048, device=dev)
            b = torch.randn(2048, 2048, device=dev)
            while time.time() < deadline:
                a = (a @ b).clamp_(-1, 1)
            torch.cuda.synchronize()
            return "cuda"
    except Exception as exc:  # noqa: BLE001 — fall back honestly
        log.info("PyTorch/CUDA path unavailable (%s); using CPU fallback", exc)

    # Fallback: CPU (numpy if present, else pure Python). Reported honestly.
    try:
        import numpy as np  # type: ignore

        a = np.random.rand(1024, 1024)
        b = np.random.rand(1024, 1024)
        while time.time() < deadline:
            a = np.clip(a @ b, -1, 1)
        return "cpu (numpy)"
    except Exception:  # noqa: BLE001
        x = 0.0
        while time.time() < deadline:
            x = (x + 1.0) ** 0.5 % 3.0
        return "cpu (python)"


def _current_utilization() -> int | None:
    try:
        gpus = gc.get_gpu_telemetry()
        if gpus:
            return int(gpus[0].get("utilization_percent") or 0)
    except gc.NvidiaSmiError:
        return None
    return None


def run_job(execution_id: str, workload_type: str, duration_seconds: int) -> None:
    if workload_type not in ALLOWED_WORKLOADS:
        log.error("Rejected job %s: workload_type %r not allowlisted", execution_id, workload_type)
        _report(execution_id, "FAILED", error=f"workload_type '{workload_type}' not allowed")
        return
    log.info("Running %s (%s) for %ss", execution_id, workload_type, duration_seconds)
    _report(execution_id, "RUNNING")
    try:
        device = _run_matmul(duration_seconds)
        util = _current_utilization()
        _report(execution_id, "COMPLETED", device=device, utilization=util or 0)
        log.info("Completed %s on %s", execution_id, device)
    except Exception as exc:  # noqa: BLE001
        _report(execution_id, "FAILED", error=str(exc)[:400])
        log.error("Execution %s failed: %s", execution_id, exc)


def poll_loop() -> None:
    log.info("MINDSource node agent starting")
    log.info("  node_id : %s", config.NODE_ID)
    log.info("  backend : %s", config.API_URL)
    while True:
        _send_telemetry_safe()
        resp = _post(config.claim_url(), {"node_id": config.NODE_ID})
        job = (resp or {}).get("job")
        if job:
            run_job(job["execution_id"], job["workload_type"], int(job["duration_seconds"]))
        else:
            time.sleep(config.POLL_INTERVAL_SECONDS)


def main() -> int:
    try:
        poll_loop()
    except KeyboardInterrupt:
        log.info("Agent stopped by user")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
