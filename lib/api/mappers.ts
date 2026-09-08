// Map raw API responses (snake_case) to UI/domain types (camelCase).
// Keeping this in one place means components never see wire shapes, and a
// future schema change only needs edits here.

import type {
  CandidateScore,
  ConnectorNode,
  Decision,
  DecisionDetail,
  DecisionFactor,
  FleetMetrics,
  GpuInventory,
  InfrastructureData,
  Node,
  ScheduleBlock,
  ScheduleData,
  MLPrediction,
  Execution,
  ExecutionCandidate,
  ResourceRecommendation,
  SchedulePool,
  SecurityPolicy,
  SecurityScanResult,
  SecurityViolation,
  WhatIfResult,
  Workload,
} from "@/lib/types";
import type {
  CandidateScoreResponse,
  ConnectorNodeResponse,
  DecisionDetailResponse,
  DecisionRecommendationResponse,
  DecisionResponse,
  FleetMetricsResponse,
  GpuInventoryResponse,
  InfrastructureResponse,
  NodeResponse,
  ScheduleResponse,
  MLPredictionResponse,
  SchedulePoolResponse,
  ScheduleBlockResponse,
  SecurityPolicyResponse,
  SecurityScanResponse,
  SecurityViolationResponse,
  ExecutionCandidateResponse,
  ExecutionResponse,
  WhatIfResponseBody,
  WorkloadResponse,
} from "./types";

export function mapInventory(r: GpuInventoryResponse): GpuInventory {
  return {
    gpuType: r.gpu_type,
    total: r.total,
    allocated: r.allocated,
    available: r.available,
    utilization: r.utilization,
  };
}

export function mapMetrics(r: FleetMetricsResponse): FleetMetrics {
  return {
    totalGpus: r.total_gpus,
    availableGpus: r.available_gpus,
    allocatedGpus: r.allocated_gpus,
    gpuUtilization: r.gpu_utilization,
    activeWorkloads: r.active_workloads,
    queuedWorkloads: r.queued_workloads,
    estimatedHourlyCost: r.estimated_hourly_cost,
  };
}

export function mapInfrastructure(r: InfrastructureResponse): InfrastructureData {
  return {
    cluster: r.cluster,
    environment: r.environment,
    nodeCount: r.node_count,
    inventory: r.inventory.map(mapInventory),
    metrics: mapMetrics(r.metrics),
  };
}

export function mapNode(r: NodeResponse): Node {
  return {
    id: r.id,
    name: r.name,
    gpuType: r.gpu_type,
    totalGpus: r.total_gpus,
    allocatedGpus: r.allocated_gpus,
    availableGpus: r.available_gpus,
    utilization: r.utilization,
    memoryUtilization: r.memory_utilization,
    status: r.status,
    region: r.region,
    runningWorkloadIds: r.running_workload_ids ?? [],
    source: r.source ?? "simulated",
    hostname: r.hostname ?? undefined,
    gpuName: r.gpu_name ?? undefined,
    memoryTotalMb: r.memory_total_mb ?? undefined,
    memoryUsedMb: r.memory_used_mb ?? undefined,
    temperatureC: r.temperature_c ?? undefined,
    lastSeen: r.last_seen ?? undefined,
    liveStatus: r.live_status ?? undefined,
  };
}

export function mapConnectorNode(r: ConnectorNodeResponse): ConnectorNode {
  return {
    nodeId: r.node_id,
    name: r.name,
    source: r.source,
    hostname: r.hostname ?? undefined,
    gpuName: r.gpu_name ?? undefined,
    gpuCount: r.gpu_count,
    utilization: r.utilization,
    memoryUsedMb: r.memory_used_mb ?? undefined,
    memoryTotalMb: r.memory_total_mb ?? undefined,
    temperatureC: r.temperature_c ?? undefined,
    lastSeen: r.last_seen ?? undefined,
    liveStatus: r.live_status ?? undefined,
  };
}

export function mapWorkload(r: WorkloadResponse): Workload {
  return {
    id: r.id,
    name: r.name,
    team: r.team,
    type: r.type,
    gpuRequested: r.gpu_requested,
    gpuType: r.gpu_type,
    memoryGb: r.memory_gb,
    durationHours: r.duration_hours,
    priority: r.priority,
    deadline: r.deadline,
    status: r.status,
    nodeId: r.node_id ?? undefined,
    securityStatus: r.security_status ?? undefined,
    securityRisk: r.security_risk ?? undefined,
    mlPrediction: r.ml_prediction ? mapMlPrediction(r.ml_prediction) : null,
    resourceRecommendation: r.resource_recommendation
      ? mapRecommendation(r.resource_recommendation)
      : null,
  };
}

export function mapMlPrediction(r: MLPredictionResponse): MLPrediction {
  return {
    model: r.model,
    target: r.target,
    prediction: r.prediction,
    unit: r.unit,
    predictionHours: r.prediction_hours,
    topFeatures: r.top_features ?? [],
    dataset: r.dataset ?? undefined,
  };
}

function mapCandidate(c: CandidateScoreResponse): CandidateScore {
  return {
    resource: c.resource,
    gpuType: c.gpu_type,
    source: c.source,
    total: c.total,
    available: c.available,
    utilization: c.utilization,
    tier: c.tier,
    eligible: c.eligible,
    score: c.score,
    reasons: c.reasons ?? [],
  };
}

export function mapRecommendation(
  r: DecisionRecommendationResponse,
): ResourceRecommendation {
  return {
    recommendedResource: r.recommended_resource,
    predictedRuntimeMinutes: r.predicted_runtime_minutes,
    prediction: r.prediction ? mapMlPrediction(r.prediction) : null,
    candidates: r.candidates.map(mapCandidate),
    explanation: r.explanation ?? [],
  };
}

export function mapWhatIf(r: WhatIfResponseBody): WhatIfResult {
  return {
    persisted: r.persisted,
    security: mapSecurityScanResult(r.security),
    recommendation: r.recommendation
      ? mapRecommendation(r.recommendation)
      : null,
  };
}

function mapExecutionCandidate(c: ExecutionCandidateResponse): ExecutionCandidate {
  return {
    nodeId: c.node_id,
    name: c.name,
    gpuName: c.gpu_name,
    totalVramMb: c.total_vram_mb,
    availableVramMb: c.available_vram_mb,
    utilization: c.utilization,
    online: c.online,
    eligible: c.eligible,
    score: c.score,
    reasons: c.reasons ?? [],
  };
}

export function mapExecution(r: ExecutionResponse): Execution {
  return {
    id: r.id,
    workloadName: r.workload_name,
    workloadType: r.workload_type,
    gpuRequested: r.gpu_requested,
    memoryMb: r.memory_mb,
    durationSeconds: r.duration_seconds,
    state: r.state,
    selectedNodeId: r.selected_node_id,
    selectedGpuName: r.selected_gpu_name,
    reason: r.reason,
    explanation: r.explanation ?? [],
    candidates: (r.candidates ?? []).map(mapExecutionCandidate),
    device: r.device,
    lastUtilization: r.last_utilization,
    error: r.error,
    createdAt: r.created_at,
    assignedAt: r.assigned_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    security: r.security ? mapSecurityScanResult(r.security) : null,
  };
}

export function mapDecision(r: DecisionResponse): Decision {
  return {
    id: r.id,
    timestamp: r.timestamp,
    workloadName: r.workload_name,
    workloadId: r.workload_id ?? undefined,
    type: r.type,
    gpuType: r.gpu_type,
    gpuCount: r.gpu_count,
    priority: r.priority,
    reason: r.reason,
    status: r.status,
  };
}

function mapFactor(f: DecisionDetailResponse["factors"][number]): DecisionFactor {
  return { label: f.label, value: f.value, weight: f.weight };
}

export function mapDecisionDetail(r: DecisionDetailResponse): DecisionDetail {
  return {
    ...mapDecision(r),
    recommendedGpuType: r.recommended_gpu_type,
    recommendedGpuCount: r.recommended_gpu_count,
    startTime: r.start_time,
    expectedCompletion: r.expected_completion,
    estimatedCost: r.estimated_cost,
    factors: r.factors.map(mapFactor),
    rationale: r.rationale,
  };
}

function mapBlock(b: ScheduleBlockResponse): ScheduleBlock {
  return {
    id: b.id,
    workloadName: b.workload_name,
    workloadType: b.workload_type,
    startHour: b.start_hour,
    endHour: b.end_hour,
    status: b.status,
  };
}

export function mapSchedulePool(p: SchedulePoolResponse): SchedulePool {
  return {
    gpuType: p.gpu_type,
    label: p.label,
    allocated: p.allocated,
    total: p.total,
    blocks: p.blocks.map(mapBlock),
  };
}

export function mapSchedule(r: ScheduleResponse): ScheduleData {
  return {
    cluster: r.cluster,
    environment: r.environment,
    startHour: r.start_hour,
    endHour: r.end_hour,
    pools: r.pools.map(mapSchedulePool),
  };
}

export function mapSecurityPolicy(r: SecurityPolicyResponse): SecurityPolicy {
  return {
    ruleCode: r.rule_code,
    name: r.name,
    severity: r.severity,
    action: r.action,
    description: r.description,
  };
}

function mapViolation(v: SecurityViolationResponse): SecurityViolation {
  return {
    ruleCode: v.rule_code,
    severity: v.severity,
    message: v.message,
    action: v.action,
  };
}

export function mapSecurityScanResult(r: SecurityScanResponse): SecurityScanResult {
  return {
    status: r.status,
    riskLevel: r.risk_level,
    violations: r.violations.map(mapViolation),
    scannedRules: r.scanned_rules,
  };
}
