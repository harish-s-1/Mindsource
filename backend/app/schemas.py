"""Pydantic (v2) request/response models.

Field names are snake_case on the wire. The frontend still uses its own local
mock data in Phase 1B, so no camelCase aliasing is required yet; a real
integration in a later phase can add aliases here without touching the ORM.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

GpuType = Literal["H100", "A100", "L4", "T4"]
NodeStatus = Literal["Healthy", "Degraded", "Offline"]
WorkloadType = Literal[
    "Training", "Inference", "Fine-tuning", "Batch", "Experimentation"
]
WorkloadStatus = Literal["Running", "Queued", "Completed", "Waiting"]
Priority = Literal["Critical", "High", "Medium", "Low"]
DecisionType = Literal[
    "Allocated", "Deferred", "Rescheduled", "Protected capacity", "Rejected"
]
DecisionStatus = Literal["Pending", "Approved", "Rejected", "Applied"]


# --- Nodes -----------------------------------------------------------------
class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    gpu_type: GpuType
    total_gpus: int
    allocated_gpus: int
    available_gpus: int
    utilization: int
    memory_utilization: int
    status: NodeStatus
    region: str
    running_workload_ids: list[str] = Field(default_factory=list)


# --- Workloads -------------------------------------------------------------
class WorkloadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    team: str
    type: WorkloadType
    gpu_requested: int
    gpu_type: GpuType
    memory_gb: int
    duration_hours: int
    priority: Priority
    deadline: str
    status: WorkloadStatus
    node_id: Optional[str] = None


class WorkloadCreate(BaseModel):
    """Payload for POST /api/workloads.

    Persists a workload record only. No scheduling/analysis is performed in
    Phase 1B — new workloads default to the Queued state.
    """

    name: str = Field(min_length=1, max_length=120)
    team: str = Field(min_length=1, max_length=120)
    type: WorkloadType
    gpu_requested: int = Field(ge=1, le=64)
    gpu_type: GpuType
    memory_gb: int = Field(ge=1, le=8192)
    duration_hours: int = Field(ge=0, le=2160)
    priority: Priority
    deadline: str
    status: WorkloadStatus = "Queued"


# --- Decisions -------------------------------------------------------------
class DecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: str
    workload_name: str
    workload_id: Optional[str] = None
    type: DecisionType
    gpu_type: GpuType
    gpu_count: int
    priority: Priority
    reason: str
    status: DecisionStatus


class DecisionFactor(BaseModel):
    label: str
    value: str
    weight: Literal["High", "Medium", "Low"]


class DecisionDetailOut(DecisionOut):
    recommended_gpu_type: GpuType
    recommended_gpu_count: int
    start_time: str
    expected_completion: str
    estimated_cost: float
    factors: list[DecisionFactor] = Field(default_factory=list)
    rationale: list[str] = Field(default_factory=list)


# --- Infrastructure / inventory -------------------------------------------
class GpuInventory(BaseModel):
    gpu_type: GpuType
    total: int
    allocated: int
    available: int
    utilization: int


class FleetMetrics(BaseModel):
    total_gpus: int
    available_gpus: int
    allocated_gpus: int
    gpu_utilization: int
    active_workloads: int
    queued_workloads: int
    estimated_hourly_cost: float


class InfrastructureOut(BaseModel):
    cluster: str
    environment: str
    node_count: int
    inventory: list[GpuInventory]
    metrics: FleetMetrics


# --- Schedule --------------------------------------------------------------
class ScheduleBlock(BaseModel):
    id: str
    workload_name: str
    workload_type: WorkloadType
    start_hour: int
    end_hour: int
    status: Literal["Running", "Scheduled", "Queued"]


class SchedulePool(BaseModel):
    gpu_type: GpuType
    label: str
    allocated: int
    total: int
    blocks: list[ScheduleBlock] = Field(default_factory=list)


class ScheduleOut(BaseModel):
    cluster: str
    environment: str
    start_hour: int
    end_hour: int
    pools: list[SchedulePool]


# --- Health ----------------------------------------------------------------
class HealthOut(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    simulated: bool
