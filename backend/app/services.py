"""Read-only aggregation helpers.

These derive inventory and fleet metrics from persisted nodes/workloads. They
are NOT a scheduling engine — no allocation decisions are made here; they only
summarize existing simulated state (Phase 1C will add the engine).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from .config import GPU_HOURLY_RATE, GPU_TYPES
from .models import Node, Workload
from .schemas import FleetMetrics, GpuInventory


def compute_inventory(db: Session) -> list[GpuInventory]:
    nodes = db.query(Node).all()
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
    nodes = db.query(Node).all()
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
