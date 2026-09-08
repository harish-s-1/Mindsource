# MINDSource — AI Cloud Resource Intelligence

An enterprise operational console that turns GPU-cluster telemetry and workload
requests into **explainable resource intelligence**. MINDSource is a decision
layer — it advises an existing scheduler, it does not replace Kubernetes/Slurm.

Its core pipeline — **Observe → Secure → Predict → Optimize → Execute → Explain**
— applied identically to real submissions, what-if simulations, and automatic
real-GPU execution:

```
Observe        Secure           Predict            Optimize          Execute            Explain
telemetry → Security Engine → XGBoost prediction → Decision Engine → Execution → "why this GPU?"
             "allowed?"        "what behavior?"     "best fit?"      "run it"
```

> **Honesty first.** The GPU fleet (H100/A100/L4/T4) is **simulated** demo data
> and is clearly labelled as such. The **NVIDIA connector telemetry is real**
> (from `nvidia-smi`). The ML model is trained on a **real public** GPU-cluster
> trace and is **advisory** — see [Limitations](#limitations). Nothing in the UI
> fabricates telemetry, predictions, metrics, or prices.

---

## Architecture

| Layer | Tech | What it does |
|---|---|---|
| Frontend | Next.js (App Router), React, TypeScript (strict), Tailwind, Recharts, lucide-react | Operational console: Overview, Infrastructure, Workloads, Decisions, Schedule, Security Center, What-if. All backend calls go through a centralized `lib/api` client. |
| Backend | FastAPI, SQLAlchemy, SQLite, Pydantic v2 | Infra/workload/decision/schedule APIs, security engine, ML inference, decision engine, what-if, connector ingestion. |
| Connector | Python stdlib only | Reads real `nvidia-smi` telemetry and POSTs it to the backend. |
| ML | pandas, scikit-learn, XGBoost | **Offline** training on the Microsoft Philly GPU-cluster trace; the backend only does inference. |

```
Live GPU (RTX 3050) → nvidia-smi → Connector ─┐
                                              ├→ FastAPI → SQLite → Next.js console
Simulated H100/A100/L4/T4 fleet ──────────────┘
                                              │
Workload → Security → XGBoost → Decision Engine → Recommendation (+ What-if simulation)
```

## Key features

- **Security Policy Engine** — deterministic rules SEC-001…SEC-007 (privileged,
  host net/PID/path, dangerous capabilities, unapproved registry, excessive GPU),
  surfaced in the Security Center and enforced as an automatic gate on workload
  creation.
- **Real NVIDIA connector** — `nvidia-smi` → live/stale node heartbeat on the
  Infrastructure page, alongside the simulated pools.
- **XGBoost runtime model** — trained on the **real** Microsoft Philly trace
  (106,452 usable jobs); inference-only in the API.
- **Decision Engine** — deterministic GPU-candidate scoring
  (`0.35·availability + 0.25·pressure + 0.40·right-size`) with eligibility and
  human-readable reasons.
- **What-if simulator** — runs a hypothetical workload through the *same* real
  pipeline with **no persistence**.
- **Automatic real-GPU execution** — routes a predefined, allowlisted workload
  to the best-fit **real** GPU node (e.g. RTX 3050 vs RTX 4050) by VRAM /
  availability / utilization scoring, then a **node agent** on that machine
  launches it and reports live state. Multiple laptops register independently
  via `MINDSOURCE_NODE_ID`.

### Implemented vs simulated vs not-implemented

**Implemented (real):** NVIDIA `nvidia-smi` telemetry · security gate · XGBoost
prediction · Decision Engine · automatic real-GPU **selection** · controlled,
allowlisted GPU **execution** via a pull-based node agent.

**Simulated (demo):** the 64-GPU H100/A100/L4/T4 pools, their metrics/schedule,
and cloud cost.

**Not implemented:** Kubernetes/Slurm/cloud integration; production remote
execution/auth; and **true live migration of a running process between GPUs**.
Here, "automatic GPU switching" means *automatic workload placement onto the
most suitable available GPU **before** execution* — not mid-run migration.

### Two real GPU nodes (agent)

The connector is **outbound-only**. Execution uses a **pull model**: the backend
enqueues a job for the selected `node_id`; each machine's agent polls for its
job, runs an allowlisted workload locally (real GPU load via PyTorch+CUDA, else
an honest CPU fallback labelled `device: cpu`), and reports back. No inbound
server, no arbitrary remote shell.

```bash
# on each laptop with an NVIDIA GPU (point API_URL at the backend's LAN IP)
cd connector
MINDSOURCE_NODE_ID=harish-rtx3050  MINDSOURCE_API_URL=http://<backend-ip>:8000  python node_agent.py
# friend's machine:
MINDSOURCE_NODE_ID=friend-rtx4050  MINDSOURCE_API_URL=http://<backend-ip>:8000  python node_agent.py
```

## Repository layout

```
app/, components/, lib/     Next.js frontend
backend/                    FastAPI service      (see backend/README.md)
connector/                  NVIDIA GPU connector (see connector/README.md)
ml/                         XGBoost pipeline     (see ml/README.md)
```

## Quick start

**Prerequisites:** Node.js 18+, Python 3.11+ (developed on 3.14).

```bash
# 1) Backend (+ ML inference deps)
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1   |  bash: source .venv/Scripts/activate
pip install -r requirements.txt
pip install -r ../ml/requirements.txt
python -m uvicorn app.main:app --reload --port 8000     # http://localhost:8000/docs
```

```bash
# 2) Frontend  (new terminal, from the repo root)
npm install
npm run dev                                             # http://localhost:3000
```

```bash
# 3) (optional) Real GPU telemetry — on a machine with an NVIDIA GPU
cd connector
python gpu_connector.py
```

The ML model (`ml/models/runtime_xgboost.json`) is committed, so predictions work
out of the box. To retrain from the real dataset, see [`ml/README.md`](ml/README.md).

## Tests

```bash
cd backend && python -m tests.test_smoke     # full backend suite (66 checks)
cd ../ml   && python -m tests.test_pipeline  # ML pipeline checks
```
```bash
npx tsc --noEmit && npm run lint && npm run build   # frontend
```

## Configuration

- Frontend: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`) — see `.env.example`.
- Backend: `MINDSOURCE_MAX_GPU_REQUEST`, `MINDSOURCE_APPROVED_REGISTRIES`,
  `MINDSOURCE_STALE_AFTER_SECONDS`, `MINDSOURCE_CORS_ORIGINS`, and ML model-path
  overrides. See `backend/app/config.py`.

## Limitations

This is a hackathon prototype, not production infrastructure.

- The H100/A100/L4/T4 fleet, metrics, schedule and cost figures are **simulated**.
- The XGBoost model is **advisory**: on the real Philly trace it scores
  MAE ≈ 356 min, R² ≈ 0 in raw minutes (log-space R² ≈ 0.15). Job runtime is
  weakly predictable from resource-request features — read it as an
  order-of-magnitude estimate, not a precise forecast.
- The model trains on the **Microsoft Philly** trace as a reachable substitute
  for the requested Alibaba `cluster-trace-gpu-v2026` (whose data host was
  unreachable from the build network); the pipeline also targets v2026.
- No pricing data exists, so the Decision Engine uses capacity/utilization/
  capability efficiency rather than cost. No Kubernetes/Slurm/cloud integration.

## License / data

Raw datasets and virtualenvs are **not** committed (see `.gitignore` files). The
Philly trace is © Microsoft Research (research use); download it via
`ml/src/download_dataset.py`.


