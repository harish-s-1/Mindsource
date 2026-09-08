// Wire types — these mirror the FastAPI Pydantic schemas exactly (snake_case).
// They are the raw API response shapes; mappers.ts converts them into the
// camelCase UI/domain types in lib/types.ts that components consume.

import type {
  DecisionStatus,
  DecisionType,
  GpuType,
  LiveStatus,
  NodeStatus,
  PolicyAction,
  Priority,
  RiskLevel,
  ScanStatus,
  Severity,
  WorkloadStatus,
  WorkloadType,
} from "@/lib/types";

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  simulated: boolean;
}

export interface GpuInventoryResponse {
  gpu_type: GpuType;
  total: number;
  allocated: number;
  available: number;
  utilization: number;
}

export interface FleetMetricsResponse {
  total_gpus: number;
  available_gpus: number;
  allocated_gpus: number;
  gpu_utilization: number;
  active_workloads: number;
  queued_workloads: number;
  estimated_hourly_cost: number;
}

export interface InfrastructureResponse {
  cluster: string;
  environment: string;
  node_count: number;
  inventory: GpuInventoryResponse[];
  metrics: FleetMetricsResponse;
}

export interface NodeResponse {
  id: string;
  name: string;
  gpu_type: string;
  total_gpus: number;
  allocated_gpus: number;
  available_gpus: number;
  utilization: number;
  memory_utilization: number;
  status: NodeStatus;
  region: string;
  running_workload_ids: string[];
  source: string;
  hostname: string | null;
  gpu_name: string | null;
  memory_total_mb: number | null;
  memory_used_mb: number | null;
  temperature_c: number | null;
  last_seen: string | null;
  live_status: LiveStatus | null;
}

export interface ConnectorNodeResponse {
  node_id: string;
  name: string;
  source: string;
  hostname: string | null;
  gpu_name: string | null;
  gpu_count: number;
  utilization: number;
  memory_used_mb: number | null;
  memory_total_mb: number | null;
  temperature_c: number | null;
  last_seen: string | null;
  live_status: LiveStatus | null;
}

export interface WorkloadResponse {
  id: string;
  name: string;
  team: string;
  type: WorkloadType;
  gpu_requested: number;
  gpu_type: GpuType;
  memory_gb: number;
  duration_hours: number;
  priority: Priority;
  deadline: string;
  status: WorkloadStatus;
  node_id: string | null;
  // Automatic security-gate result (Phase 2D). Present on create; null on list.
  security_status?: ScanStatus | null;
  security_risk?: RiskLevel | null;
  // Advisory ML prediction (Phase 3D). Present on create when a model exists.
  ml_prediction?: MLPredictionResponse | null;
  // Advisory Decision Engine recommendation (Phase 3C). Present on create.
  resource_recommendation?: DecisionRecommendationResponse | null;
}

// --- Decision Engine (Phase 3C) --------------------------------------------
export interface CandidateScoreResponse {
  resource: string;
  gpu_type: string;
  source: string;
  total: number;
  available: number;
  utilization: number;
  tier: number;
  eligible: boolean;
  score: number;
  reasons: string[];
}

export interface DecisionRecommendationResponse {
  recommended_resource: string | null;
  predicted_runtime_minutes: number | null;
  prediction: MLPredictionResponse | null;
  candidates: CandidateScoreResponse[];
  explanation: string[];
}

export interface DecisionRecommendRequestBody {
  gpu_requested: number;
  gpu_type?: GpuType;
}

// --- What-if simulation (Phase 4) ------------------------------------------
export interface WhatIfRequestBody {
  gpu_requested: number;
  gpu_type?: GpuType;
  name?: string;
  image?: string;
  privileged?: boolean;
  host_network?: boolean;
  host_pid?: boolean;
  host_path_mounts?: boolean;
  capabilities?: string[];
}

export interface WhatIfResponseBody {
  persisted: boolean;
  security: SecurityScanResponse;
  recommendation: DecisionRecommendationResponse | null;
}

// --- Execution controller (Phase 4) ----------------------------------------
export interface ExecutionRequestBody {
  workload_name: string;
  workload_type: "gpu_benchmark" | "matrix_multiply" | "cuda_stress";
  gpu_requested?: number;
  memory_mb: number;
  duration_seconds: number;
  image?: string;
  privileged?: boolean;
  host_network?: boolean;
}

export interface ExecutionCandidateResponse {
  node_id: string;
  name: string;
  gpu_name: string;
  total_vram_mb: number;
  available_vram_mb: number;
  utilization: number;
  online: boolean;
  eligible: boolean;
  score: number;
  reasons: string[];
}

export interface ExecutionResponse {
  id: string;
  workload_name: string;
  workload_type: string;
  gpu_requested: number;
  memory_mb: number;
  duration_seconds: number;
  state:
    | "QUEUED"
    | "ASSIGNED"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "NO_ELIGIBLE_GPU"
    | "BLOCKED";
  selected_node_id: string | null;
  selected_gpu_name: string | null;
  reason: string | null;
  explanation: string[];
  candidates: ExecutionCandidateResponse[];
  device: string | null;
  last_utilization: number | null;
  error: string | null;
  created_at: string;
  assigned_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  security: SecurityScanResponse | null;
}

// --- ML (Phase 3B/3C) ------------------------------------------------------
export interface MLPredictionResponse {
  model: string;
  target: string;
  prediction: number;
  unit: string;
  prediction_hours: number;
  top_features: string[];
  dataset?: string | null;
}

// POST /api/ml/predict request body.
export interface MLPredictRequestBody {
  gpu_count: number;
  num_servers?: number;
  submit_hour?: number;
  submit_dow?: number;
  vc?: string;
}

// POST /api/workloads request body (matches WorkloadCreate). The security
// fields are optional with safe defaults; the form only sends `image`.
export interface WorkloadCreateRequest {
  name: string;
  team: string;
  type: WorkloadType;
  gpu_requested: number;
  gpu_type: GpuType;
  memory_gb: number;
  duration_hours: number;
  priority: Priority;
  deadline: string;
  status?: WorkloadStatus;
  image?: string;
  privileged?: boolean;
  host_network?: boolean;
  host_pid?: boolean;
  host_path_mounts?: boolean;
  capabilities?: string[];
}

// Structured `detail` in the 403 when the security gate blocks creation.
export interface WorkloadBlockedDetailResponse {
  status: ScanStatus;
  risk_level: RiskLevel;
  message: string;
  violations: SecurityViolationResponse[];
  scanned_rules: number;
}

export interface DecisionResponse {
  id: string;
  timestamp: string;
  workload_name: string;
  workload_id: string | null;
  type: DecisionType;
  gpu_type: GpuType;
  gpu_count: number;
  priority: Priority;
  reason: string;
  status: DecisionStatus;
}

export interface DecisionFactorResponse {
  label: string;
  value: string;
  weight: "High" | "Medium" | "Low";
}

export interface DecisionDetailResponse extends DecisionResponse {
  recommended_gpu_type: GpuType;
  recommended_gpu_count: number;
  start_time: string;
  expected_completion: string;
  estimated_cost: number;
  factors: DecisionFactorResponse[];
  rationale: string[];
}

export interface ScheduleBlockResponse {
  id: string;
  workload_name: string;
  workload_type: WorkloadType;
  start_hour: number;
  end_hour: number;
  status: "Running" | "Scheduled" | "Queued";
}

export interface SchedulePoolResponse {
  gpu_type: GpuType;
  label: string;
  allocated: number;
  total: number;
  blocks: ScheduleBlockResponse[];
}

export interface ScheduleResponse {
  cluster: string;
  environment: string;
  start_hour: number;
  end_hour: number;
  pools: SchedulePoolResponse[];
}

// --- Security (Phase 2A) ---------------------------------------------------
export interface SecurityPolicyResponse {
  rule_code: string;
  name: string;
  severity: Severity;
  action: PolicyAction;
  description: string;
}

export interface SecurityViolationResponse {
  rule_code: string;
  severity: Severity;
  message: string;
  action: PolicyAction;
}

export interface SecurityScanResponse {
  status: ScanStatus;
  risk_level: RiskLevel;
  violations: SecurityViolationResponse[];
  scanned_rules: number;
}

// Request body for POST /api/security/scan (snake_case, sent as-is — matches
// the createWorkload precedent). Safe defaults are set by the scanner form.
export interface SecurityScanRequest {
  workload_id?: string;
  name?: string;
  image?: string;
  privileged: boolean;
  host_network: boolean;
  host_pid: boolean;
  host_path_mounts: boolean;
  capabilities: string[];
  gpu_count: number;
}
