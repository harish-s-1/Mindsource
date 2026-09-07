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
  gpuType: GpuType;
  totalGpus: number;
  allocatedGpus: number;
  availableGpus: number;
  utilization: number; // 0-100, simulated
  memoryUtilization: number; // 0-100, simulated
  status: NodeStatus;
  region: string;
  runningWorkloadIds: string[];
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
  blocks: ScheduleBlock[];
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
