"""Connector configuration.

All values are read from environment variables with safe local-dev defaults, so
nothing about the target GPU or backend is hardcoded. Designed so HTTPS can be
used in production simply by pointing MINDSOURCE_API_URL at an https:// URL.
"""

from __future__ import annotations

import os
import socket


def _default_node_id() -> str:
    # Stable per-machine id so repeated runs update the same node (no duplicates).
    return f"laptop-{socket.gethostname().lower()}"


# Backend base URL. Send telemetry ONLY here (see gpu_connector security notes).
API_URL: str = os.environ.get("MINDSOURCE_API_URL", "http://localhost:8000").rstrip("/")

# Endpoint path for GPU telemetry ingestion.
TELEMETRY_PATH: str = os.environ.get(
    "MINDSOURCE_TELEMETRY_PATH", "/api/connectors/gpu/telemetry"
)

# Logical node identity for this machine.
NODE_ID: str = os.environ.get("MINDSOURCE_NODE_ID", _default_node_id())

# Human-readable hostname reported alongside telemetry.
HOSTNAME: str = os.environ.get("MINDSOURCE_HOSTNAME", socket.gethostname())

# How often to poll nvidia-smi and push telemetry (seconds).
POLL_INTERVAL_SECONDS: float = float(
    os.environ.get("MINDSOURCE_POLL_INTERVAL", "5")
)

# Per-request HTTP timeout (seconds).
REQUEST_TIMEOUT_SECONDS: float = float(
    os.environ.get("MINDSOURCE_REQUEST_TIMEOUT", "5")
)

# Identifies this connector as the telemetry source in the payload.
SOURCE: str = os.environ.get("MINDSOURCE_SOURCE", "nvidia-smi")

# --- Execution agent (Phase 4, pull model) ---------------------------------
# The agent polls the backend for jobs assigned to this node and reports back.
# It never opens a server or accepts inbound commands.
EXECUTION_CLAIM_PATH: str = os.environ.get(
    "MINDSOURCE_EXECUTION_CLAIM_PATH", "/api/execution/agent/claim"
)
EXECUTION_UPDATE_PATH: str = os.environ.get(
    "MINDSOURCE_EXECUTION_UPDATE_PATH", "/api/execution/agent/update"
)


def telemetry_url() -> str:
    return f"{API_URL}{TELEMETRY_PATH}"


def claim_url() -> str:
    return f"{API_URL}{EXECUTION_CLAIM_PATH}"


def update_url() -> str:
    return f"{API_URL}{EXECUTION_UPDATE_PATH}"
