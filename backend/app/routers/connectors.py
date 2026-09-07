"""Connector telemetry endpoints.

Inbound-only: connectors POST telemetry here; MINDSource never pushes commands
back. This is the ingestion side of the connector adapter model — the NVIDIA
nvidia-smi connector is the first producer, and future connectors (Kubernetes,
Slurm, cloud) can post the same TelemetryPayload contract.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Node
from ..schemas import ConnectorNodeOut, TelemetryAck, TelemetryPayload
from ..services import live_nodes, node_live_status, upsert_from_telemetry

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


@router.post("/gpu/telemetry", response_model=TelemetryAck)
def ingest_gpu_telemetry(
    payload: TelemetryPayload, db: Session = Depends(get_db)
) -> TelemetryAck:
    """Accept GPU telemetry from a local connector and upsert the node.

    Validation is handled by Pydantic (unknown fields are rejected). The write
    is idempotent on node_id, so repeated telemetry updates one node rather than
    creating duplicates.
    """
    node = upsert_from_telemetry(db, payload)
    return TelemetryAck(
        status="accepted",
        node_id=node.id,
        source=node.source,
        gpu_count=node.total_gpus,
        utilization=node.utilization,
        memory_used_mb=node.memory_used_mb or 0,
        memory_total_mb=node.memory_total_mb or 0,
        last_seen=node.last_seen or "",
        live_status=node_live_status(node) or "online",  # type: ignore[arg-type]
    )


@router.get("/nodes", response_model=list[ConnectorNodeOut])
def get_connector_nodes(db: Session = Depends(get_db)) -> list[ConnectorNodeOut]:
    """List live (connector-reported) nodes with heartbeat status."""
    return [_to_connector_out(n) for n in live_nodes(db)]


def _to_connector_out(node: Node) -> ConnectorNodeOut:
    return ConnectorNodeOut(
        node_id=node.id,
        name=node.name,
        source=node.source,
        hostname=node.hostname,
        gpu_name=node.gpu_name,
        gpu_count=node.total_gpus,
        utilization=node.utilization,
        memory_used_mb=node.memory_used_mb,
        memory_total_mb=node.memory_total_mb,
        temperature_c=node.temperature_c,
        last_seen=node.last_seen,
        live_status=node_live_status(node),  # type: ignore[arg-type]
    )
