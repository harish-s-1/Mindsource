"""SQLAlchemy ORM models: GPU nodes, workloads, decisions.

The scheduling engine is intentionally absent (Phase 1C). These models only
persist the simulated inventory the frontend already displays.
"""

from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    gpu_type: Mapped[str] = mapped_column(String, nullable=False)
    total_gpus: Mapped[int] = mapped_column(Integer, nullable=False)
    allocated_gpus: Mapped[int] = mapped_column(Integer, nullable=False)
    available_gpus: Mapped[int] = mapped_column(Integer, nullable=False)
    utilization: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_utilization: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str] = mapped_column(String, nullable=False)
    # Ids of workloads currently running on this node (denormalized for fidelity
    # with the frontend seed; workloads also carry a node_id back-reference).
    running_workload_ids: Mapped[list[str]] = mapped_column(JSON, default=list)


class Workload(Base):
    __tablename__ = "workloads"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    team: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    gpu_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    gpu_type: Mapped[str] = mapped_column(String, nullable=False)
    memory_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    priority: Mapped[str] = mapped_column(String, nullable=False)
    deadline: Mapped[str] = mapped_column(String, nullable=False)  # ISO 8601
    status: Mapped[str] = mapped_column(String, nullable=False)
    node_id: Mapped[str | None] = mapped_column(
        ForeignKey("nodes.id"), nullable=True
    )


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String, nullable=False)  # ISO 8601
    workload_name: Mapped[str] = mapped_column(String, nullable=False)
    workload_id: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    gpu_type: Mapped[str] = mapped_column(String, nullable=False)
    gpu_count: Mapped[int] = mapped_column(Integer, nullable=False)
    priority: Mapped[str] = mapped_column(String, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)

    # Extended detail — populated for the seeded "demo" record; synthesized for
    # others at read time. Stored here so a real engine can fill them in 1C.
    recommended_gpu_type: Mapped[str | None] = mapped_column(String, nullable=True)
    recommended_gpu_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_time: Mapped[str | None] = mapped_column(String, nullable=True)
    expected_completion: Mapped[str | None] = mapped_column(String, nullable=True)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    # factors: list[{label, value, weight}]; rationale: list[str]
    factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rationale: Mapped[list | None] = mapped_column(JSON, nullable=True)
