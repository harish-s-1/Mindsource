// MINDSource — remaining SIMULATED static data.
// ---------------------------------------------------------------------------
// As of the integration phase, operational data (nodes, workloads, decisions,
// inventory, metrics, schedule) comes from the FastAPI backend via lib/api.
// This module now holds only the pieces the backend does NOT yet provide and
// that remain simulated/static:
//   - cluster identity labels (shell chrome)
//   - the GPU utilization trend chart series (no historical time-series API)
//   - the system-status panel (no live health feed)
// Everything here is clearly labeled SIMULATION wherever it is rendered.
// ---------------------------------------------------------------------------

import type { SystemStatusItem, UtilizationPoint } from "./types";

// Cluster identity — matches the backend environment, used as shell chrome.
export const CLUSTER_NAME = "production-ai";
export const ENVIRONMENT_LABEL = "Demo / Simulation";

// Simulated utilization trend. The backend does not expose a historical
// time-series endpoint, so this remains a static illustrative series.
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

// Simulated system status. No live health/telemetry feed exists.
const SYSTEM_STATUS: SystemStatusItem[] = [
  { label: "Cluster health", state: "Simulated", detail: "8 nodes reporting · 1 degraded (simulated)" },
  { label: "Scheduler", state: "Simulated", detail: "Decision layer advisory mode (simulated)" },
  { label: "Telemetry", state: "Simulated", detail: "Synthetic metrics — no live ingestion" },
  { label: "Cost estimation", state: "Simulated", detail: "Static rate card (simulated)" },
];

export function getUtilizationTrend(): UtilizationPoint[] {
  return UTILIZATION_TREND;
}

export function getSystemStatus(): SystemStatusItem[] {
  return SYSTEM_STATUS;
}
