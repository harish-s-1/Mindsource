// MINDSource — shared domain types.
// NOTE: Every value produced from these types in this prototype is SIMULATED.
// There is no live telemetry, scheduler, or model behind any of it.

export type GpuType = "H100" | "A100" | "L4" | "T4";

export type NodeStatus = "Healthy" | "Degraded" | "Offline";

export type WorkloadType =
  | "Training"
  | "Inference"
  | "Fine-tuning"
  | "Batch"
  | "Experimentation";

export type WorkloadStatus = "Running" | "Queued" | "Completed" | "Waiting";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type DecisionType =
  | "Allocated"
  | "Deferred"
  | "Rescheduled"
  | "Protected capacity"
  | "Rejected";

export type DecisionStatus = "Pending" | "Approved" | "Rejected" | "Applied";

// Live connector heartbeat status. null/undefined for simulated nodes.
export type LiveStatus = "online" | "stale";

export interface GpuInventory {
  gpuType: GpuType;
  total: number;
  allocated: number;
  available: number;
  utilization: number; // 0-100, simulated
}

export interface Node {
  id: string;
  name: string;
  // Live nodes report a real accelerator name that is not a pool type, so this
  // is a plain string rather than the GpuType union.
  gpuType: string;
  totalGpus: number;
  allocatedGpus: number;
  availableGpus: number;
  utilization: number; // 0-100
  memoryUtilization: number; // 0-100
  status: NodeStatus;
  region: string;
  runningWorkloadIds: string[];
  // Provenance / live-telemetry fields. "simulated" for the demo fleet.
  source: string;
  hostname?: string;
  gpuName?: string;
  memoryTotalMb?: number;
  memoryUsedMb?: number;
  temperatureC?: number;
  lastSeen?: string;
  liveStatus?: LiveStatus;
}

// Live (connector-reported) node summary for the Connect Infrastructure panel.
export interface ConnectorNode {
  nodeId: string;
  name: string;
  source: string;
  hostname?: string;
  gpuName?: string;
  gpuCount: number;
  utilization: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  temperatureC?: number;
  lastSeen?: string;
  liveStatus?: LiveStatus;
}

export interface Workload {
  id: string;
  name: string;
  team: string;
  type: WorkloadType;
  gpuRequested: number;
  gpuType: GpuType;
  memoryGb: number;
  durationHours: number;
  priority: Priority;
  deadline: string; // ISO
  status: WorkloadStatus;
  nodeId?: string; // set when running/allocated
  // Automatic security-gate result, present on the create response only.
  securityStatus?: ScanStatus;
  securityRisk?: RiskLevel;
  // Advisory ML runtime prediction, present on the create response when the
  // model is available (null otherwise — never fabricated).
  mlPrediction?: MLPrediction | null;
  // Advisory Decision Engine recommendation, present on the create response.
  resourceRecommendation?: ResourceRecommendation | null;
}

// --- Resource Decision Engine (Phase 3C) -----------------------------------
export interface CandidateScore {
  resource: string;
  gpuType: string;
  source: string;
  total: number;
  available: number;
  utilization: number;
  tier: number;
  eligible: boolean;
  score: number;
  reasons: string[];
}

export interface ResourceRecommendation {
  recommendedResource: string | null;
  predictedRuntimeMinutes: number | null;
  prediction: MLPrediction | null;
  candidates: CandidateScore[];
  explanation: string[];
}

// --- What-if simulation (Phase 4) ------------------------------------------
export interface WhatIfResult {
  persisted: boolean;
  security: SecurityScanResult;
  recommendation: ResourceRecommendation | null;
}

// --- ML runtime prediction (Phase 3B/3C) -----------------------------------
export interface MLPrediction {
  model: string; // e.g. "XGBoost"
  target: string; // e.g. "runtime_minutes"
  prediction: number;
  unit: string; // e.g. "minutes"
  predictionHours: number;
  topFeatures: string[];
  dataset?: string;
}

export interface Decision {
  id: string;
  timestamp: string; // ISO
  workloadName: string;
  workloadId?: string;
  type: DecisionType;
  gpuType: GpuType;
  gpuCount: number;
  priority: Priority;
  reason: string;
  status: DecisionStatus;
}

export interface ScheduleBlock {
  id: string;
  workloadName: string;
  workloadType: WorkloadType;
  startHour: number; // hour of day, 24h
  endHour: number;
  status: "Running" | "Scheduled" | "Queued";
}

export interface SchedulePool {
  gpuType: GpuType;
  label: string;
  allocated: number;
  total: number;
  blocks: ScheduleBlock[];
}

export interface ScheduleData {
  cluster: string;
  environment: string;
  startHour: number;
  endHour: number;
  pools: SchedulePool[];
}

export interface FleetMetrics {
  totalGpus: number;
  availableGpus: number;
  allocatedGpus: number;
  gpuUtilization: number; // 0-100, simulated
  activeWorkloads: number;
  queuedWorkloads: number;
  estimatedHourlyCost: number; // USD, simulated
}

export interface InfrastructureData {
  cluster: string;
  environment: string;
  nodeCount: number;
  inventory: GpuInventory[];
  metrics: FleetMetrics;
}

export interface UtilizationPoint {
  time: string; // HH:mm label
  utilization: number; // 0-100, simulated
}

export interface WorkloadDistribution {
  type: WorkloadType;
  count: number;
}

export interface SystemStatusItem {
  label: string;
  state: "Operational" | "Degraded" | "Simulated";
  detail: string;
}

export interface DecisionFactor {
  label: string;
  value: string;
  weight: "High" | "Medium" | "Low";
}

export interface DecisionDetail extends Decision {
  recommendedGpuType: GpuType;
  recommendedGpuCount: number;
  startTime: string; // HH:mm
  expectedCompletion: string; // HH:mm
  estimatedCost: number; // USD, simulated
  factors: DecisionFactor[];
  rationale: string[];
}

// --- Security (Phase 2A backend / 2C UI) -----------------------------------
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ScanStatus = "PASS" | "BLOCK";
export type PolicyAction = "BLOCK";

export interface SecurityPolicy {
  ruleCode: string;
  name: string;
  severity: Severity;
  action: PolicyAction;
  description: string;
}

export interface SecurityViolation {
  ruleCode: string;
  severity: Severity;
  message: string;
  action: PolicyAction;
}

export interface SecurityScanResult {
  status: ScanStatus;
  riskLevel: RiskLevel;
  violations: SecurityViolation[];
  scannedRules: number;
}
