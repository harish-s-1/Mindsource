# MINDSource — AI Cloud Resource Intelligence

An enterprise operational console that turns GPU-cluster telemetry and workload
requests into **explainable resource intelligence**. MINDSource is a decision
layer — it advises an existing scheduler, it does not replace Kubernetes/Slurm.

Its core pipeline, applied identically to real submissions and to what-if
simulations:

```
Workload → Security Engine → XGBoost prediction → Decision Engine → Recommendation → Why?
              "allowed?"        "what behavior?"      "best fit?"        "explain it"
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
cd backend && python -m tests.test_smoke     # full backend suite (57 checks)
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


