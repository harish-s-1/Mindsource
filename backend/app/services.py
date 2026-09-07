"""Read-only aggregation helpers plus live-telemetry upsert.

The aggregation helpers derive inventory and fleet metrics and are NOT a
scheduling engine — no allocation decisions are made here. They summarize the
SIMULATED fleet only; live connector nodes are additive and surfaced
separately, so the simulated Overview numbers are unaffected by real hardware
reporting in.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .config import (
    GPU_HOURLY_RATE,
    GPU_TYPES,
    SIMULATED_SOURCE,
    STALE_AFTER_SECONDS,
)
from .models import Node, Workload
from .schemas import FleetMetrics, GpuInventory, NodeOut, TelemetryPayload


def _is_simulated(node: Node) -> bool:
    # Legacy rows may predate the source column; treat missing as simulated.
    return (node.source or SIMULATED_SOURCE) == SIMULATED_SOURCE


def compute_inventory(db: Session) -> list[GpuInventory]:
    # Simulated pools only — live connector nodes are not part of the demo pools.
    nodes = [n for n in db.query(Node).all() if _is_simulated(n)]
    inventory: list[GpuInventory] = []
    for gpu_type in GPU_TYPES:
        pool = [n for n in nodes if n.gpu_type == gpu_type]
        total = sum(n.total_gpus for n in pool)
        allocated = sum(n.allocated_gpus for n in pool)
        available = total - allocated
        utilization = round((allocated / total) * 100) if total else 0
        inventory.append(
            GpuInventory(
                gpu_type=gpu_type,
                total=total,
                allocated=allocated,
                available=available,
                utilization=utilization,
            )
        )
    return inventory


def compute_metrics(db: Session) -> FleetMetrics:
    # Fleet metrics summarize the simulated fleet only (see module docstring).
    nodes = [n for n in db.query(Node).all() if _is_simulated(n)]
    workloads = db.query(Workload).all()

    total_gpus = sum(n.total_gpus for n in nodes)
    allocated_gpus = sum(n.allocated_gpus for n in nodes)
    available_gpus = total_gpus - allocated_gpus
    gpu_utilization = round((allocated_gpus / total_gpus) * 100) if total_gpus else 0

    active = sum(1 for w in workloads if w.status == "Running")
    queued = sum(1 for w in workloads if w.status in ("Queued", "Waiting"))

    hourly_cost = sum(
        n.allocated_gpus * GPU_HOURLY_RATE.get(n.gpu_type, 0.0) for n in nodes
    )

    return FleetMetrics(
        total_gpus=total_gpus,
        available_gpus=available_gpus,
        allocated_gpus=allocated_gpus,
        gpu_utilization=gpu_utilization,
        active_workloads=active,
        queued_workloads=queued,
        estimated_hourly_cost=round(hourly_cost * 100) / 100,
    )


def simulated_node_count(db: Session) -> int:
    return sum(1 for n in db.query(Node).all() if _is_simulated(n))


# --- Live heartbeat / status ------------------------------------------------
def _parse_iso(value: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def node_live_status(node: Node) -> str | None:
    """Prototype heartbeat: online if telemetry is recent, else stale.

    Returns None for simulated nodes (they have no connector reporting in).
    """
    if _is_simulated(node):
        return None
    if not node.last_seen:
        return "stale"
    seen = _parse_iso(node.last_seen)
    if seen is None:
        return "stale"
    age = (datetime.now(timezone.utc) - seen).total_seconds()
    return "online" if age < STALE_AFTER_SECONDS else "stale"


def to_node_out(node: Node) -> NodeOut:
    out = NodeOut.model_validate(node)
    out.live_status = node_live_status(node)  # type: ignore[assignment]
    return out


# --- Connector telemetry upsert --------------------------------------------
def upsert_from_telemetry(db: Session, payload: TelemetryPayload) -> Node:
    """Create or update a single node from a connector telemetry payload.

    Idempotent: keyed on payload.node_id, so repeated telemetry updates the same
    row rather than creating duplicates. Allocation is NOT managed for real
    hardware (allocated=0, available=count) — MINDSource only observes it here.
    """
    gpus = payload.gpus
    count = len(gpus)
    memory_total_mb = sum(g.memory_total_mb for g in gpus)
    memory_used_mb = sum(g.memory_used_mb for g in gpus)
    utilization = round(sum(g.utilization_percent for g in gpus) / count)
    memory_utilization = (
        round((memory_used_mb / memory_total_mb) * 100) if memory_total_mb else 0
    )
    temps = [g.temperature_c for g in gpus if g.temperature_c is not None]
    temperature_c = max(temps) if temps else None
    gpu_name = gpus[0].name
    display_name = payload.hostname or payload.node_id
    now_iso = datetime.now(timezone.utc).isoformat()

    node = db.get(Node, payload.node_id)
    if node is None:
        node = Node(
            id=payload.node_id,
            running_workload_ids=[],
        )
        db.add(node)

    node.name = display_name
    node.gpu_type = gpu_name
    node.gpu_name = gpu_name
    node.total_gpus = count
    node.allocated_gpus = 0
    node.available_gpus = count
    node.utilization = utilization
    node.memory_utilization = memory_utilization
    node.memory_total_mb = memory_total_mb
    node.memory_used_mb = memory_used_mb
    node.temperature_c = temperature_c
    node.status = "Healthy"
    node.region = payload.hostname or "local"
    node.source = payload.source
    node.hostname = payload.hostname
    node.last_seen = now_iso

    db.commit()
    db.refresh(node)
    return node


def live_nodes(db: Session) -> list[Node]:
    return [n for n in db.query(Node).order_by(Node.id).all() if not _is_simulated(n)]
