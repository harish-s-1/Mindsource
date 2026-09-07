"""Static configuration and shared constants.

These mirror the Phase 1A frontend mock-data module so the backend seed stays
consistent with the existing UI. Everything here describes a SIMULATED demo
environment.
"""

from __future__ import annotations

import os

# --- Environment / cluster identity (matches frontend mock-data) -----------
CLUSTER_NAME = "production-ai"
ENVIRONMENT_LABEL = "Demo / Simulation"

# Simulated per-GPU-hour rates in USD. Not a live pricing feed.
GPU_HOURLY_RATE: dict[str, float] = {
    "H100": 3.5,
    "A100": 2.1,
    "L4": 0.75,
    "T4": 0.4,
}

# Ordered GPU pools for inventory aggregation.
GPU_TYPES = ["H100", "A100", "L4", "T4"]

# Schedule window (24h) — matches frontend schedule view.
SCHEDULE_START_HOUR = 12
SCHEDULE_END_HOUR = 20

# --- Database --------------------------------------------------------------
# SQLite file lives next to the backend package by default.
_DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mindsource.db")
DATABASE_URL = os.environ.get("MINDSOURCE_DATABASE_URL", f"sqlite:///{_DEFAULT_DB}")

# --- CORS ------------------------------------------------------------------
# Allow the local Next.js dev server (and its 127.0.0.1 alias) to call the API.
# Override with a comma-separated MINDSOURCE_CORS_ORIGINS env var if needed.
_DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("MINDSOURCE_CORS_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]
