# MINDSource NVIDIA GPU Connector

A small, standard-library-only agent that reads **real** GPU telemetry from
`nvidia-smi` on this machine and pushes it to the MINDSource backend. The live
node then appears on the MINDSource Infrastructure dashboard alongside the
simulated demo fleet.

```
Laptop NVIDIA GPU → gpu_connector.py → POST /api/connectors/gpu/telemetry → FastAPI → DB → Dashboard
```

## Requirements

- Python 3.9+
- A working NVIDIA driver with `nvidia-smi` on `PATH`
- No third-party packages (uses `subprocess`, `urllib`, `json`, …)

## Run (Windows PowerShell)

Start the backend first (from `backend/`), then:

```powershell
cd connector
python gpu_connector.py
```

Stop with `Ctrl+C`.

## Configuration (environment variables)

All optional — sensible local defaults are used.

| Variable | Default | Purpose |
|---|---|---|
| `MINDSOURCE_API_URL` | `http://localhost:8000` | Backend base URL (set an `https://` URL in production) |
| `MINDSOURCE_NODE_ID` | `laptop-<hostname>` | Stable node id (prevents duplicate nodes) |
| `MINDSOURCE_HOSTNAME` | machine hostname | Reported hostname |
| `MINDSOURCE_POLL_INTERVAL` | `5` | Seconds between telemetry pushes |
| `MINDSOURCE_REQUEST_TIMEOUT` | `5` | HTTP request timeout (seconds) |
| `MINDSOURCE_SOURCE` | `nvidia-smi` | Telemetry source label |

Example:

```powershell
$env:MINDSOURCE_POLL_INTERVAL = "3"
python gpu_connector.py
```

## What it collects

One fixed, read-only `nvidia-smi` query per poll, for each GPU:
index, name, memory total/used/free (MB), utilization (%), temperature (°C).

## Security

- **Telemetry flow is outbound from the connector to MINDSource. The connector
  does not provide remote command execution.** The backend cannot run anything
  on this machine.
- Sends data **only** to the single configured backend URL.
- Runs one hardcoded, read-only `nvidia-smi` command (no shell, no injected
  input); collects only the GPU fields above.
- Does **not** read files, environment secrets, credentials, or passwords, and
  never uploads arbitrary files.
- Localhost HTTP is fine for the local demo; point `MINDSOURCE_API_URL` at an
  `https://` endpoint for production.

## Not implemented (by design, this phase)

Kubernetes / Slurm / cloud connectors, authentication, workload execution, and
remote control. This is telemetry-only. The code is structured as an adapter
(`get_gpu_telemetry → normalize_telemetry → send_telemetry → poll_loop`) so
other connectors can later emit the same telemetry contract.
