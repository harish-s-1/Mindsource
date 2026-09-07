// Client-side derivations over API data. These are simple presentational
// aggregations (not scheduling logic) — used where the backend returns the
// underlying records but not the rolled-up view a screen needs.

import type { Workload, WorkloadDistribution, WorkloadType } from "./types";

const DISTRIBUTION_ORDER: WorkloadType[] = [
  "Training",
  "Inference",
  "Fine-tuning",
  "Batch",
  "Experimentation",
];

// Count active (non-completed) workloads per type, matching the prior
// overview breakdown — now computed from the backend workload list.
export function workloadDistribution(
  workloads: Workload[],
): WorkloadDistribution[] {
  const active = workloads.filter((w) => w.status !== "Completed");
  return DISTRIBUTION_ORDER.map((type) => ({
    type,
    count: active.filter((w) => w.type === type).length,
  }));
}
