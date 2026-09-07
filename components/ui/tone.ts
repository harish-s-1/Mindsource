import type {
  DecisionStatus,
  DecisionType,
  NodeStatus,
  Priority,
  WorkloadStatus,
} from "@/lib/types";
import type { BadgeTone } from "./StatusBadge";

export function workloadStatusTone(status: WorkloadStatus): BadgeTone {
  switch (status) {
    case "Running":
      return "healthy";
    case "Queued":
      return "warning";
    case "Waiting":
      return "idle";
    case "Completed":
      return "accent";
  }
}

export function nodeStatusTone(status: NodeStatus): BadgeTone {
  switch (status) {
    case "Healthy":
      return "healthy";
    case "Degraded":
      return "warning";
    case "Offline":
      return "critical";
  }
}

export function priorityTone(priority: Priority): BadgeTone {
  switch (priority) {
    case "Critical":
      return "critical";
    case "High":
      return "warning";
    case "Medium":
      return "accent";
    case "Low":
      return "idle";
  }
}

export function decisionTypeTone(type: DecisionType): BadgeTone {
  switch (type) {
    case "Allocated":
      return "healthy";
    case "Deferred":
      return "warning";
    case "Rescheduled":
      return "warning";
    case "Protected capacity":
      return "accent";
    case "Rejected":
      return "critical";
  }
}

export function decisionStatusTone(status: DecisionStatus): BadgeTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "Approved":
      return "healthy";
    case "Applied":
      return "accent";
    case "Rejected":
      return "critical";
  }
}

export function utilizationTone(utilization: number): BadgeTone {
  if (utilization >= 90) return "critical";
  if (utilization >= 70) return "warning";
  if (utilization <= 5) return "idle";
  return "healthy";
}
