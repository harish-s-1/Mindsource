// MINDSource — central simulated data layer.
// ---------------------------------------------------------------------------
// EVERYTHING in this file is SIMULATED demo data. There is no backend,
// scheduler, telemetry pipeline, or model. Pages/components must read through
// the accessor functions at the bottom rather than importing the raw arrays,
// so a real data source can be swapped in later without touching the UI.
// Data is kept internally consistent: node allocations sum to pool inventory,
// running workloads map onto node allocations, and pool costs derive from rates.
// ---------------------------------------------------------------------------

import type {
  Decision,
  DecisionDetail,
  FleetMetrics,
  GpuInventory,
  GpuType,
  Node,
  SchedulePool,
  SystemStatusItem,
  UtilizationPoint,
  Workload,
  WorkloadDistribution,
  WorkloadType,
} from "./types";

export const CLUSTER_NAME = "production-ai";
export const ENVIRONMENT_LABEL = "Demo / Simulation";

// Simulated per-GPU-hour rates (USD). Not a live pricing feed.
export const GPU_HOURLY_RATE: Record<GpuType, number> = {
  H100: 3.5,
  A100: 2.1,
  L4: 0.75,
  T4: 0.4,
};

// --- Nodes -----------------------------------------------------------------
const NODES: Node[] = [
  {
    id: "gpu-node-01",
    name: "gpu-node-01",
    gpuType: "H100",
    totalGpus: 8,
    allocatedGpus: 6,
    availableGpus: 2,
    utilization: 75,
    memoryUtilization: 71,
    status: "Healthy",
    region: "us-east-1a",
    runningWorkloadIds: ["wl-foundation-pretrain"],
  },
  {
    id: "gpu-node-02",
    name: "gpu-node-02",
    gpuType: "H100",
    totalGpus: 8,
    allocatedGpus: 8,
    availableGpus: 0,
    utilization: 100,
    memoryUtilization: 94,
    status: "Healthy",
    region: "us-east-1a",
    runningWorkloadIds: ["wl-llm-training"],
  },
  {
    id: "gpu-node-03",
    name: "gpu-node-03",
    gpuType: "L4",
    totalGpus: 8,
    allocatedGpus: 5,
    availableGpus: 3,
    utilization: 62,
    memoryUtilization: 58,
    status: "Healthy",
    region: "us-east-1b",
    runningWorkloadIds: ["wl-production-inference"],
  },
  {
    id: "gpu-node-04",
    name: "gpu-node-04",
    gpuType: "T4",
    totalGpus: 8,
    allocatedGpus: 3,
    availableGpus: 5,
    utilization: 37,
    memoryUtilization: 33,
    status: "Healthy",
    region: "us-east-1b",
    runningWorkloadIds: ["wl-batch-embedding"],
  },
  {
    id: "gpu-node-05",
    name: "gpu-node-05",
    gpuType: "A100",
    totalGpus: 8,
    allocatedGpus: 4,
    availableGpus: 4,
    utilization: 50,
    memoryUtilization: 47,
    status: "Healthy",
    region: "us-west-2a",
    runningWorkloadIds: ["wl-recommender-training"],
  },
  {
    id: "gpu-node-06",
    name: "gpu-node-06",
    gpuType: "A100",
    totalGpus: 8,
    allocatedGpus: 6,
    availableGpus: 2,
    utilization: 75,
    memoryUtilization: 69,
    status: "Degraded",
    region: "us-west-2a",
    runningWorkloadIds: ["wl-multimodal-finetune"],
  },
  {
    id: "gpu-node-07",
    name: "gpu-node-07",
    gpuType: "L4",
    totalGpus: 8,
    allocatedGpus: 8,
    availableGpus: 0,
    utilization: 100,
    memoryUtilization: 88,
    status: "Healthy",
    region: "us-east-1b",
    runningWorkloadIds: ["wl-realtime-gateway"],
  },
  {
    id: "gpu-node-08",
    name: "gpu-node-08",
    gpuType: "T4",
    totalGpus: 8,
    allocatedGpus: 0,
    availableGpus: 8,
    utilization: 0,
    memoryUtilization: 0,
    status: "Healthy",
    region: "us-east-1b",
    runningWorkloadIds: [],
  },
];

// --- Workloads -------------------------------------------------------------
// Running workloads consume the allocated GPUs on their node. Queued/Waiting
// workloads do not consume node capacity yet.
const WORKLOADS: Workload[] = [
  {
    id: "wl-llm-training",
    name: "LLM Training Run",
    team: "Foundation Models",
    type: "Training",
    gpuRequested: 8,
    gpuType: "H100",
    memoryGb: 640,
    durationHours: 72,
    priority: "Critical",
    deadline: "2026-09-10T18:00:00Z",
    status: "Running",
    nodeId: "gpu-node-02",
  },
  {
    id: "wl-foundation-pretrain",
    name: "Foundation Model Pretrain",
    team: "Foundation Models",
    type: "Training",
    gpuRequested: 6,
    gpuType: "H100",
    memoryGb: 480,
    durationHours: 96,
    priority: "High",
    deadline: "2026-09-11T12:00:00Z",
    status: "Running",
    nodeId: "gpu-node-01",
  },
  {
    id: "wl-recommender-training",
    name: "Recommender Training",
    team: "Ranking",
    type: "Training",
    gpuRequested: 4,
    gpuType: "A100",
    memoryGb: 320,
    durationHours: 24,
    priority: "High",
    deadline: "2026-09-08T09:00:00Z",
    status: "Running",
    nodeId: "gpu-node-05",
  },
  {
    id: "wl-multimodal-finetune",
    name: "Multimodal Fine-tune",
    team: "Perception",
    type: "Fine-tuning",
    gpuRequested: 6,
    gpuType: "A100",
    memoryGb: 480,
    durationHours: 12,
    priority: "Medium",
    deadline: "2026-09-08T20:00:00Z",
    status: "Running",
    nodeId: "gpu-node-06",
  },
  {
    id: "wl-production-inference",
    name: "Production Inference",
    team: "Serving",
    type: "Inference",
    gpuRequested: 5,
    gpuType: "L4",
    memoryGb: 120,
    durationHours: 0,
    priority: "Critical",
    deadline: "2026-09-07T23:59:00Z",
    status: "Running",
    nodeId: "gpu-node-03",
  },
  {
    id: "wl-realtime-gateway",
    name: "Realtime Inference Gateway",
    team: "Serving",
    type: "Inference",
    gpuRequested: 8,
    gpuType: "L4",
    memoryGb: 192,
    durationHours: 0,
    priority: "High",
    deadline: "2026-09-07T23:59:00Z",
    status: "Running",
    nodeId: "gpu-node-07",
  },
  {
    id: "wl-batch-embedding",
    name: "Batch Embedding",
    team: "Data Platform",
    type: "Batch",
    gpuRequested: 3,
    gpuType: "T4",
    memoryGb: 48,
    durationHours: 3,
    priority: "Low",
    deadline: "2026-09-08T06:00:00Z",
    status: "Running",
    nodeId: "gpu-node-04",
  },
  {
    id: "wl-vision-finetune",
    name: "Vision Fine-tune",
    team: "Perception",
    type: "Fine-tuning",
    gpuRequested: 4,
    gpuType: "L4",
    memoryGb: 96,
    durationHours: 3,
    priority: "Medium",
    deadline: "2026-09-07T21:00:00Z",
    status: "Queued",
  },
  {
    id: "wl-research-experiment",
    name: "Research Experiment",
    team: "Research",
    type: "Experimentation",
    gpuRequested: 2,
    gpuType: "L4",
    memoryGb: 48,
    durationHours: 6,
    priority: "Low",
    deadline: "2026-09-09T12:00:00Z",
    status: "Queued",
  },
  {
    id: "wl-nightly-scoring",
    name: "Nightly Batch Scoring",
    team: "Data Platform",
    type: "Batch",
    gpuRequested: 4,
    gpuType: "T4",
    memoryGb: 64,
    durationHours: 4,
    priority: "Low",
    deadline: "2026-09-08T05:00:00Z",
    status: "Waiting",
  },
  {
    id: "wl-sentiment-inference",
    name: "Sentiment Inference",
    team: "Serving",
    type: "Inference",
    gpuRequested: 3,
    gpuType: "L4",
    memoryGb: 72,
    durationHours: 0,
    priority: "Medium",
    deadline: "2026-09-08T00:00:00Z",
    status: "Waiting",
  },
  {
    id: "wl-hparam-sweep",
    name: "Hyperparameter Sweep",
    team: "Research",
    type: "Experimentation",
    gpuRequested: 6,
    gpuType: "T4",
    memoryGb: 96,
    durationHours: 8,
    priority: "Low",
    deadline: "2026-09-09T18:00:00Z",
    status: "Queued",
  },
  {
    id: "wl-overnight-checkpoint",
    name: "Overnight Training Checkpoint",
    team: "Foundation Models",
    type: "Training",
    gpuRequested: 8,
    gpuType: "H100",
    memoryGb: 640,
    durationHours: 6,
    priority: "High",
    deadline: "2026-09-07T06:00:00Z",
    status: "Completed",
  },
  {
    id: "wl-dataset-preprocess",
    name: "Dataset Preprocessing",
    team: "Data Platform",
    type: "Batch",
    gpuRequested: 4,
    gpuType: "T4",
    memoryGb: 64,
    durationHours: 5,
    priority: "Medium",
    deadline: "2026-09-07T04:00:00Z",
    status: "Completed",
  },
];

// --- Decisions (audit log) -------------------------------------------------
const DECISIONS: Decision[] = [
  {
    id: "demo",
    timestamp: "2026-09-07T14:12:00Z",
    workloadName: "Vision Fine-tune",
    workloadId: "wl-vision-finetune",
    type: "Allocated",
    gpuType: "L4",
    gpuCount: 4,
    priority: "Medium",
    reason: "L4 meets deadline while preserving reserved H100 capacity",
    status: "Pending",
  },
  {
    id: "dec-1042",
    timestamp: "2026-09-07T13:58:00Z",
    workloadName: "LLM Training Run",
    workloadId: "wl-llm-training",
    type: "Protected capacity",
    gpuType: "H100",
    gpuCount: 8,
    priority: "Critical",
    reason: "Reserved H100 pool for critical training run",
    status: "Applied",
  },
  {
    id: "dec-1041",
    timestamp: "2026-09-07T13:40:00Z",
    workloadName: "Production Inference",
    workloadId: "wl-production-inference",
    type: "Allocated",
    gpuType: "L4",
    gpuCount: 5,
    priority: "Critical",
    reason: "Allocated 5 × L4 to meet inference latency target",
    status: "Applied",
  },
  {
    id: "dec-1040",
    timestamp: "2026-09-07T13:22:00Z",
    workloadName: "Realtime Inference Gateway",
    workloadId: "wl-realtime-gateway",
    type: "Allocated",
    gpuType: "L4",
    gpuCount: 8,
    priority: "High",
    reason: "Filled L4 node to serve realtime traffic",
    status: "Applied",
  },
  {
    id: "dec-1039",
    timestamp: "2026-09-07T12:55:00Z",
    workloadName: "Nightly Batch Scoring",
    workloadId: "wl-nightly-scoring",
    type: "Deferred",
    gpuType: "T4",
    gpuCount: 4,
    priority: "Low",
    reason: "Deferred flexible batch workload to off-peak window",
    status: "Applied",
  },
  {
    id: "dec-1038",
    timestamp: "2026-09-07T12:31:00Z",
    workloadName: "Recommender Training",
    workloadId: "wl-recommender-training",
    type: "Allocated",
    gpuType: "A100",
    gpuCount: 4,
    priority: "High",
    reason: "Allocated A100 for distributed training",
    status: "Applied",
  },
  {
    id: "dec-1037",
    timestamp: "2026-09-07T12:04:00Z",
    workloadName: "Hyperparameter Sweep",
    workloadId: "wl-hparam-sweep",
    type: "Rescheduled",
    gpuType: "T4",
    gpuCount: 6,
    priority: "Low",
    reason: "Rescheduled to reduce peak resource pressure",
    status: "Applied",
  },
  {
    id: "dec-1036",
    timestamp: "2026-09-07T11:38:00Z",
    workloadName: "Research Experiment",
    workloadId: "wl-research-experiment",
    type: "Deferred",
    gpuType: "L4",
    gpuCount: 2,
    priority: "Low",
    reason: "Queued behind higher-priority inference demand",
    status: "Applied",
  },
  {
    id: "dec-1035",
    timestamp: "2026-09-07T11:02:00Z",
    workloadName: "Legacy Batch Export",
    type: "Rejected",
    gpuType: "H100",
    gpuCount: 4,
    priority: "Low",
    reason: "Rejected: H100 request not justified for low-priority batch",
    status: "Applied",
  },
];

// Extended detail for the seeded demo decision.
const DEMO_DECISION_DETAIL: DecisionDetail = {
  ...DECISIONS[0],
  recommendedGpuType: "L4",
  recommendedGpuCount: 4,
  startTime: "14:20",
  expectedCompletion: "17:20",
  estimatedCost: 9.0, // 4 × L4 × $0.75/hr × 3hr (simulated)
  factors: [
    { label: "GPU compatibility", value: "Runs on L4 (no H100 requirement)", weight: "High" },
    { label: "Resource availability", value: "3 × L4 free on gpu-node-03, 1 pooled", weight: "High" },
    { label: "Priority", value: "Medium — below active critical training", weight: "Medium" },
    { label: "Deadline", value: "Due 21:00 — 17:20 completion clears it", weight: "High" },
    { label: "Duration", value: "~3 hours estimated", weight: "Low" },
    { label: "Estimated cost", value: "$9.00 (simulated)", weight: "Low" },
  ],
  rationale: [
    "The workload is L4-compatible and does not require H100-class accelerators to meet its stated memory and throughput needs.",
    "H100 capacity is currently reserved for a higher-priority training workload (LLM Training Run, Critical); consuming it here would risk that deadline.",
    "Allocating 4 × L4 satisfies the workload's requirements and clears its 21:00 deadline with a projected 17:20 completion.",
    "This preserves reserved H100 capacity for critical training while making efficient use of available L4 inventory.",
  ],
};

// --- Schedule --------------------------------------------------------------
export const SCHEDULE_START_HOUR = 12;
export const SCHEDULE_END_HOUR = 20;

const SCHEDULE_POOLS: SchedulePool[] = [
  {
    gpuType: "H100",
    label: "H100 pool",
    blocks: [
      { id: "s-h100-1", workloadName: "LLM Training Run", workloadType: "Training", startHour: 12, endHour: 19, status: "Running" },
      { id: "s-h100-2", workloadName: "Foundation Model Pretrain", workloadType: "Training", startHour: 12, endHour: 20, status: "Running" },
    ],
  },
  {
    gpuType: "A100",
    label: "A100 pool",
    blocks: [
      { id: "s-a100-1", workloadName: "Recommender Training", workloadType: "Training", startHour: 12, endHour: 17, status: "Running" },
      { id: "s-a100-2", workloadName: "Multimodal Fine-tune", workloadType: "Fine-tuning", startHour: 13, endHour: 20, status: "Running" },
    ],
  },
  {
    gpuType: "L4",
    label: "L4 pool",
    blocks: [
      { id: "s-l4-1", workloadName: "Realtime Inference Gateway", workloadType: "Inference", startHour: 12, endHour: 20, status: "Running" },
      { id: "s-l4-2", workloadName: "Production Inference", workloadType: "Inference", startHour: 12, endHour: 20, status: "Running" },
      { id: "s-l4-3", workloadName: "Vision Fine-tune", workloadType: "Fine-tuning", startHour: 14, endHour: 17, status: "Scheduled" },
    ],
  },
  {
    gpuType: "T4",
    label: "T4 pool",
    blocks: [
      { id: "s-t4-1", workloadName: "Batch Embedding", workloadType: "Batch", startHour: 12, endHour: 15, status: "Running" },
      { id: "s-t4-2", workloadName: "Hyperparameter Sweep", workloadType: "Experimentation", startHour: 16, endHour: 19, status: "Scheduled" },
      { id: "s-t4-3", workloadName: "Nightly Batch Scoring", workloadType: "Batch", startHour: 18, endHour: 20, status: "Queued" },
    ],
  },
];

// --- Utilization trend (simulated) -----------------------------------------
const UTILIZATION_TREND: UtilizationPoint[] = [
  { time: "08:00", utilization: 48 },
  { time: "09:00", utilization: 53 },
  { time: "10:00", utilization: 57 },
  { time: "11:00", utilization: 55 },
  { time: "12:00", utilization: 61 },
  { time: "13:00", utilization: 64 },
  { time: "14:00", utilization: 63 },
  { time: "15:00", utilization: 66 },
  { time: "16:00", utilization: 62 },
  { time: "17:00", utilization: 65 },
  { time: "18:00", utilization: 60 },
  { time: "19:00", utilization: 58 },
];

const SYSTEM_STATUS: SystemStatusItem[] = [
  { label: "Cluster health", state: "Simulated", detail: "8 nodes reporting · 1 degraded (simulated)" },
  { label: "Scheduler", state: "Simulated", detail: "Decision layer advisory mode (simulated)" },
  { label: "Telemetry", state: "Simulated", detail: "Synthetic metrics — no live ingestion" },
  { label: "Cost estimation", state: "Simulated", detail: "Static rate card (simulated)" },
];

// --- Derived aggregates ----------------------------------------------------
function computeInventory(): GpuInventory[] {
  const types: GpuType[] = ["H100", "A100", "L4", "T4"];
  return types.map((gpuType) => {
    const nodes = NODES.filter((n) => n.gpuType === gpuType);
    const total = nodes.reduce((s, n) => s + n.totalGpus, 0);
    const allocated = nodes.reduce((s, n) => s + n.allocatedGpus, 0);
    const available = total - allocated;
    const utilization = total === 0 ? 0 : Math.round((allocated / total) * 100);
    return { gpuType, total, allocated, available, utilization };
  });
}

function computeMetrics(): FleetMetrics {
  const totalGpus = NODES.reduce((s, n) => s + n.totalGpus, 0);
  const allocatedGpus = NODES.reduce((s, n) => s + n.allocatedGpus, 0);
  const availableGpus = totalGpus - allocatedGpus;
  const gpuUtilization = Math.round((allocatedGpus / totalGpus) * 100);
  const activeWorkloads = WORKLOADS.filter((w) => w.status === "Running").length;
  const queuedWorkloads = WORKLOADS.filter(
    (w) => w.status === "Queued" || w.status === "Waiting",
  ).length;
  const estimatedHourlyCost = NODES.reduce(
    (s, n) => s + n.allocatedGpus * GPU_HOURLY_RATE[n.gpuType],
    0,
  );
  return {
    totalGpus,
    availableGpus,
    allocatedGpus,
    gpuUtilization,
    activeWorkloads,
    queuedWorkloads,
    estimatedHourlyCost: Math.round(estimatedHourlyCost * 100) / 100,
  };
}

function computeDistribution(): WorkloadDistribution[] {
  const types: WorkloadType[] = [
    "Training",
    "Inference",
    "Fine-tuning",
    "Batch",
    "Experimentation",
  ];
  const activeSet = WORKLOADS.filter((w) => w.status !== "Completed");
  return types.map((type) => ({
    type,
    count: activeSet.filter((w) => w.type === type).length,
  }));
}

// --- Accessors (public API) ------------------------------------------------
export function getNodes(): Node[] {
  return NODES;
}

export function getNodeById(id: string): Node | undefined {
  return NODES.find((n) => n.id === id);
}

export function getWorkloads(): Workload[] {
  return WORKLOADS;
}

export function getWorkloadById(id: string): Workload | undefined {
  return WORKLOADS.find((w) => w.id === id);
}

export function getWorkloadsForNode(nodeId: string): Workload[] {
  return WORKLOADS.filter((w) => w.nodeId === nodeId);
}

export function getDecisions(): Decision[] {
  return DECISIONS;
}

export function getDecisionById(id: string): DecisionDetail | undefined {
  if (id === "demo" || id === DEMO_DECISION_DETAIL.id) {
    return DEMO_DECISION_DETAIL;
  }
  const base = DECISIONS.find((d) => d.id === id);
  if (!base) return undefined;
  // Synthesize a coherent detail record for any other decision id so the
  // dynamic route is ready to receive real ids later.
  return {
    ...base,
    recommendedGpuType: base.gpuType,
    recommendedGpuCount: base.gpuCount,
    startTime: "—",
    expectedCompletion: "—",
    estimatedCost:
      Math.round(base.gpuCount * GPU_HOURLY_RATE[base.gpuType] * 100) / 100,
    factors: [
      { label: "GPU type", value: base.gpuType, weight: "Medium" },
      { label: "GPU count", value: String(base.gpuCount), weight: "Medium" },
      { label: "Priority", value: base.priority, weight: "High" },
    ],
    rationale: [base.reason],
  };
}

export function getInventory(): GpuInventory[] {
  return computeInventory();
}

export function getFleetMetrics(): FleetMetrics {
  return computeMetrics();
}

export function getWorkloadDistribution(): WorkloadDistribution[] {
  return computeDistribution();
}

export function getSchedulePools(): SchedulePool[] {
  return SCHEDULE_POOLS;
}

export function getUtilizationTrend(): UtilizationPoint[] {
  return UTILIZATION_TREND;
}

export function getSystemStatus(): SystemStatusItem[] {
  return SYSTEM_STATUS;
}

export function getRecentDecisions(limit = 4): Decision[] {
  return DECISIONS.slice(0, limit);
}
