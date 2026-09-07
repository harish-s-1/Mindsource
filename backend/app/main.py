"""FastAPI application entrypoint.

Wires CORS, the health endpoint, and the /api routers, and seeds the SQLite
database on startup if it is empty. All served data is SIMULATED — there is no
scheduler, model, or cloud integration in this phase.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import CORS_ORIGINS, ENVIRONMENT_LABEL
from .database import SessionLocal
from .routers import decisions, infrastructure, schedule, workloads
from .schemas import HealthOut
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Ensure tables exist and seed simulated data on first run.
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="MINDSource API",
    version=__version__,
    description=(
        "Backend foundation for MINDSource (Phase 1B). Serves simulated "
        "infrastructure, workload, decision and schedule data. No scheduling "
        "engine, ML/AI, or cloud integration."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthOut, tags=["health"])
def health() -> HealthOut:
    return HealthOut(
        status="ok",
        service="mindsource-api",
        version=__version__,
        environment=ENVIRONMENT_LABEL,
        simulated=True,
    )


app.include_router(infrastructure.router)
app.include_router(workloads.router)
app.include_router(decisions.router)
app.include_router(schedule.router)
