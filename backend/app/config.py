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

# --- Connectors / live telemetry -------------------------------------------
# Node.source value for the seeded demo fleet. Anything else is a live
# connector (e.g. "nvidia-smi").
SIMULATED_SOURCE = "simulated"

# A live node whose last heartbeat is older than this many seconds is
# considered stale/offline. Prototype heartbeat logic — not production
# monitoring. Override with MINDSOURCE_STALE_AFTER_SECONDS.
STALE_AFTER_SECONDS = int(os.environ.get("MINDSOURCE_STALE_AFTER_SECONDS", "30"))

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

# --- Security policy engine (Phase 2A) -------------------------------------
# Deterministic, rule-based guardrails — not production security. See
# app.security for the rules that consume these settings.

# Maximum GPU count a single workload may request before SEC-007 blocks it.
MAX_GPU_REQUEST = int(os.environ.get("MINDSOURCE_MAX_GPU_REQUEST", "8"))

# Approved container registries (SEC-006). Small, configurable allow-list.
_DEFAULT_REGISTRIES = "docker.io,ghcr.io,nvcr.io"
APPROVED_REGISTRIES = [
    r.strip().lower()
    for r in os.environ.get(
        "MINDSOURCE_APPROVED_REGISTRIES", _DEFAULT_REGISTRIES
    ).split(",")
    if r.strip()
]

# Linux capabilities considered dangerous (SEC-005). Compared case-insensitively.
_DEFAULT_DANGEROUS_CAPS = "SYS_ADMIN,NET_ADMIN,SYS_PTRACE,ALL"
DANGEROUS_CAPABILITIES = {
    c.strip().upper()
    for c in os.environ.get(
        "MINDSOURCE_DANGEROUS_CAPABILITIES", _DEFAULT_DANGEROUS_CAPS
    ).split(",")
    if c.strip()
}
