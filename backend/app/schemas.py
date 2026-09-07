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
LiveStatus = Literal["online", "stale"]


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    # Live nodes report a real accelerator name (e.g. "NVIDIA GeForce RTX 3050")
    # that is not one of the simulated pool types, so gpu_type is a plain string.
    gpu_type: str
    total_gpus: int
    allocated_gpus: int
    available_gpus: int
    utilization: int
    memory_utilization: int
    status: NodeStatus
    region: str
    running_workload_ids: list[str] = Field(default_factory=list)

    # Provenance / live-telemetry fields.
    source: str = "simulated"
    hostname: Optional[str] = None
    gpu_name: Optional[str] = None
    memory_total_mb: Optional[int] = None
    memory_used_mb: Optional[int] = None
    temperature_c: Optional[int] = None
    last_seen: Optional[str] = None
    # Computed heartbeat status for live nodes; null for simulated nodes.
    live_status: Optional[LiveStatus] = None


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

    # Result of the automatic security gate (Phase 2D). Populated on create;
    # null on list/read since it is evaluated at creation time, not persisted.
    security_status: Optional[Literal["PASS", "BLOCK"]] = None
    security_risk: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None

    # Advisory ML runtime prediction (Phase 3D). Populated on create when the
    # model is available; null otherwise (never fabricated). Not persisted.
    ml_prediction: Optional["MLPredictionOut"] = None

    # Advisory resource recommendation from the Decision Engine (Phase 3C).
    # Populated on create; null otherwise. Not persisted.
    resource_recommendation: Optional["DecisionRecommendationOut"] = None


class WorkloadCreate(BaseModel):
    """Payload for POST /api/workloads.

    Persists a workload record. Before persistence the workload is evaluated by
    the security engine (Phase 2D); a BLOCK result rejects creation. New
    workloads default to the Queued state.
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

    # --- Security posture (Phase 2D) --------------------------------------
    # Evaluated by the security engine BEFORE persistence, then discarded — the
    # Workload table is unchanged. All fields default to safe values so existing
    # callers (which omit them) keep working and pass the gate.
    image: Optional[str] = Field(default=None, max_length=512)
    privileged: bool = False
    host_network: bool = False
    host_pid: bool = False
    host_path_mounts: bool = False
    capabilities: list[str] = Field(default_factory=list)


# Field names on WorkloadCreate that feed the security gate but are NOT columns
# on the Workload model (so they must be excluded before persistence).
WORKLOAD_SECURITY_FIELDS = frozenset(
    {"image", "privileged", "host_network", "host_pid", "host_path_mounts", "capabilities"}
)


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


# --- Connector telemetry contract ------------------------------------------
# A connector-agnostic telemetry envelope. The NVIDIA/nvidia-smi connector is
# the first producer; future connectors (Kubernetes, Slurm, cloud) can emit the
# same shape so they all normalize into the one MINDSource node representation.
class TelemetryGpu(BaseModel):
    index: int = Field(ge=0)
    name: str = Field(min_length=1, max_length=200)
    memory_total_mb: int = Field(ge=0)
    memory_used_mb: int = Field(ge=0)
    memory_free_mb: int = Field(ge=0)
    utilization_percent: int = Field(ge=0, le=100)
    temperature_c: Optional[int] = Field(default=None, ge=0, le=150)


class TelemetryPayload(BaseModel):
    # Reject unknown keys so the endpoint only ever accepts the telemetry
    # fields MINDSource expects — nothing else is stored.
    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1, max_length=64)  # e.g. "nvidia-smi"
    node_id: str = Field(min_length=1, max_length=128)
    hostname: Optional[str] = Field(default=None, max_length=253)
    timestamp: Optional[str] = None  # ISO 8601; server stamps its own last_seen
    gpus: list[TelemetryGpu] = Field(min_length=1)


class TelemetryAck(BaseModel):
    status: Literal["accepted"]
    node_id: str
    source: str
    gpu_count: int
    utilization: int
    memory_used_mb: int
    memory_total_mb: int
    last_seen: str
    live_status: LiveStatus


class ConnectorNodeOut(BaseModel):
    """Live (connector-reported) node summary for the Connect Infrastructure UI."""

    node_id: str
    name: str
    source: str
    hostname: Optional[str] = None
    gpu_name: Optional[str] = None
    gpu_count: int
    utilization: int
    memory_used_mb: Optional[int] = None
    memory_total_mb: Optional[int] = None
    temperature_c: Optional[int] = None
    last_seen: Optional[str] = None
    live_status: Optional[LiveStatus] = None


# --- Security policy engine (Phase 2A) -------------------------------------
Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
ScanStatus = Literal["PASS", "BLOCK"]
PolicyAction = Literal["BLOCK"]


class SecurityScanRequest(BaseModel):
    """Security posture of a workload to evaluate.

    A standalone input — the existing Workload model is unchanged. All security
    fields default to safe values, so a minimal or legacy payload scans cleanly
    (extra fields, e.g. from a full workload record, are ignored).
    """

    model_config = ConfigDict(extra="ignore")

    workload_id: Optional[str] = None
    name: Optional[str] = None
    image: Optional[str] = None
    privileged: bool = False
    host_network: bool = False
    host_pid: bool = False
    host_path_mounts: bool = False
    capabilities: list[str] = Field(default_factory=list)
    gpu_count: int = Field(default=1, ge=0)


class SecurityViolation(BaseModel):
    rule_code: str
    severity: Severity
    message: str
    action: PolicyAction


class SecurityScanResult(BaseModel):
    status: ScanStatus
    risk_level: RiskLevel
    violations: list[SecurityViolation] = Field(default_factory=list)
    scanned_rules: int


class WorkloadBlockedDetail(BaseModel):
    """Structured `detail` returned in the 403 when the security gate blocks a
    workload during creation (Phase 2D). Shares the scan-result shape so the
    frontend can reuse the same mapper/renderer."""

    status: ScanStatus  # always "BLOCK" here
    risk_level: RiskLevel
    message: str
    violations: list[SecurityViolation] = Field(default_factory=list)
    scanned_rules: int


class SecurityPolicyOut(BaseModel):
    rule_code: str
    name: str
    severity: Severity
    action: PolicyAction
    description: str


# --- ML runtime prediction (Phase 3B/3C) -----------------------------------
class MLPredictRequest(BaseModel):
    """Workload information known BEFORE execution.

    Only `gpu_count` is required and is the primary feature the model uses; the
    other fields are optional refinements. Extra workload fields are ignored so
    the workload-creation flow can pass a full workload without error.
    """

    model_config = ConfigDict(extra="ignore")

    gpu_count: int = Field(ge=1, le=4096)
    num_servers: Optional[int] = Field(default=None, ge=1)
    submit_hour: Optional[int] = Field(default=None, ge=0, le=23)
    submit_dow: Optional[int] = Field(default=None, ge=0, le=6)
    vc: Optional[str] = None


class MLPredictionOut(BaseModel):
    # `model` is a plain field name here (the ML algorithm), not a Pydantic
    # reserved attribute — opt out of the protected namespace to avoid warnings.
    model_config = ConfigDict(protected_namespaces=())

    model: str
    target: str
    prediction: float
    unit: str
    prediction_hours: float
    top_features: list[str] = Field(default_factory=list)


class MLPredictResponse(MLPredictionOut):
    dataset: Optional[str] = None


# --- Resource Decision Engine (Phase 3C) -----------------------------------
class DecisionRecommendRequest(BaseModel):
    """Minimum workload info the decision engine needs."""

    model_config = ConfigDict(extra="ignore")

    gpu_requested: int = Field(ge=1, le=4096)
    gpu_type: Optional[GpuType] = None  # optional preference (advisory only)


class CandidateScoreOut(BaseModel):
    resource: str
    gpu_type: str
    source: str
    total: int
    available: int
    utilization: int
    tier: int
    eligible: bool
    score: float
    reasons: list[str] = Field(default_factory=list)


class DecisionRecommendationOut(BaseModel):
    recommended_resource: Optional[str] = None
    predicted_runtime_minutes: Optional[float] = None
    prediction: Optional[MLPredictionOut] = None
    candidates: list[CandidateScoreOut] = Field(default_factory=list)
    explanation: list[str] = Field(default_factory=list)


# --- What-if simulation (Phase 4) ------------------------------------------
class WhatIfRequest(BaseModel):
    """A hypothetical workload to simulate through the real pipeline.

    Reuses the security fields (safe defaults) plus the resource request. Extra
    fields are ignored. This is evaluated exactly like a real submission but is
    never persisted.
    """

    model_config = ConfigDict(extra="ignore")

    gpu_requested: int = Field(ge=1, le=4096)
    gpu_type: Optional[GpuType] = None
    name: Optional[str] = None
    image: Optional[str] = None
    privileged: bool = False
    host_network: bool = False
    host_pid: bool = False
    host_path_mounts: bool = False
    capabilities: list[str] = Field(default_factory=list)


class WhatIfResponse(BaseModel):
    # Always false — What-if never creates a workload or mutates state.
    persisted: bool = False
    security: SecurityScanResult
    # Null when security blocks (ML + Decision Engine are not run).
    recommendation: Optional[DecisionRecommendationOut] = None


# --- Health ----------------------------------------------------------------
class HealthOut(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    simulated: bool


# WorkloadOut forward-references MLPredictionOut (defined above); resolve it.
WorkloadOut.model_rebuild()
