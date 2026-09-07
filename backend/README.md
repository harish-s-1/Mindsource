# MINDSource Backend — Phase 1B

FastAPI + SQLite foundation for the MINDSource decision layer. Serves the same
**simulated** infrastructure, workload, decision and schedule data the Phase 1A
frontend already displays.

> No scheduling engine, ML/AI, or cloud integration — those are later phases.
> The frontend still uses its own local mock data; this API is not yet wired in.

## Requirements

- Python 3.11+ (developed on 3.14)

## Setup

```bash
cd backend
python -m venv .venv
# Windows (Git Bash):   source .venv/Scripts/activate
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# macOS/Linux:          source .venv/bin/activate
pip install -r requirements.txt
```

## Seed the database (optional — the API also seeds on first start)

```bash
python seed_db.py            # seed only if empty
python seed_db.py --reset    # drop and reseed
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/health

## Tests

```bash
python -m tests.test_smoke   # standalone runner
# or, with pytest installed:
pytest
```

## Endpoints

| Method | Path                     | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | `/health`                | Service health (simulated flag)      |
| GET    | `/api/infrastructure`    | Inventory per GPU pool + fleet metrics |
| GET    | `/api/nodes`             | Node inventory                       |
| GET    | `/api/workloads`         | Workload list                        |
| POST   | `/api/workloads`         | Create a workload (stored, not scheduled) |
| GET    | `/api/decisions`         | Decision audit log                   |
| GET    | `/api/decisions/{id}`    | Decision detail (`demo` seeded)      |
| GET    | `/api/schedule`          | Allocation timeline (pools + blocks) |

## Configuration (env vars)

- `MINDSOURCE_DATABASE_URL` — SQLAlchemy URL (default: `sqlite:///mindsource.db`)
- `MINDSOURCE_CORS_ORIGINS` — comma-separated origins (default: `http://localhost:3000,http://127.0.0.1:3000`)
