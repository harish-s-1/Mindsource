// Typed API client — the single entry point for all backend communication.
// Each function returns UI/domain types (camelCase) via the mappers.

import { ApiError, apiGet, apiPost } from "./http";
import {
  mapConnectorNode,
  mapDecision,
  mapDecisionDetail,
  mapInfrastructure,
  mapMlPrediction,
  mapRecommendation,
  mapWhatIf,
  mapNode,
  mapSchedule,
  mapSecurityPolicy,
  mapSecurityScanResult,
  mapWorkload,
} from "./mappers";
import type {
  ConnectorNodeResponse,
  DecisionDetailResponse,
  DecisionResponse,
  HealthResponse,
  DecisionRecommendationResponse,
  DecisionRecommendRequestBody,
  WhatIfRequestBody,
  WhatIfResponseBody,
  InfrastructureResponse,
  MLPredictionResponse,
  MLPredictRequestBody,
  NodeResponse,
  ScheduleResponse,
  SecurityPolicyResponse,
  SecurityScanRequest,
  SecurityScanResponse,
  WorkloadCreateRequest,
  WorkloadResponse,
} from "./types";
import type {
  ConnectorNode,
  Decision,
  DecisionDetail,
  InfrastructureData,
  MLPrediction,
  Node,
  ResourceRecommendation,
  WhatIfResult,
  ScheduleData,
  SecurityPolicy,
  SecurityScanResult,
  Workload,
} from "@/lib/types";

interface Opts {
  signal?: AbortSignal;
}

export function getHealth(opts?: Opts): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health", opts);
}

export async function getInfrastructure(opts?: Opts): Promise<InfrastructureData> {
  return mapInfrastructure(await apiGet<InfrastructureResponse>("/api/infrastructure", opts));
}

export async function getNodes(opts?: Opts): Promise<Node[]> {
  const rows = await apiGet<NodeResponse[]>("/api/nodes", opts);
  return rows.map(mapNode);
}

export async function getWorkloads(opts?: Opts): Promise<Workload[]> {
  const rows = await apiGet<WorkloadResponse[]>("/api/workloads", opts);
  return rows.map(mapWorkload);
}

export async function createWorkload(
  body: WorkloadCreateRequest,
  opts?: Opts,
): Promise<Workload> {
  return mapWorkload(await apiPost<WorkloadResponse>("/api/workloads", body, opts));
}

export async function getDecisions(opts?: Opts): Promise<Decision[]> {
  const rows = await apiGet<DecisionResponse[]>("/api/decisions", opts);
  return rows.map(mapDecision);
}

export async function getDecision(
  id: string,
  opts?: Opts,
): Promise<DecisionDetail> {
  return mapDecisionDetail(
    await apiGet<DecisionDetailResponse>(
      `/api/decisions/${encodeURIComponent(id)}`,
      opts,
    ),
  );
}

export async function getSchedule(opts?: Opts): Promise<ScheduleData> {
  return mapSchedule(await apiGet<ScheduleResponse>("/api/schedule", opts));
}

// Live (connector-reported) nodes for the Connect Infrastructure panel.
export async function getConnectorNodes(opts?: Opts): Promise<ConnectorNode[]> {
  const rows = await apiGet<ConnectorNodeResponse[]>("/api/connectors/nodes", opts);
  return rows.map(mapConnectorNode);
}

// --- Security (Phase 2A backend) -------------------------------------------
export async function getSecurityPolicies(opts?: Opts): Promise<SecurityPolicy[]> {
  const rows = await apiGet<SecurityPolicyResponse[]>("/api/security/policies", opts);
  return rows.map(mapSecurityPolicy);
}

export async function scanWorkloadSecurity(
  body: SecurityScanRequest,
  opts?: Opts,
): Promise<SecurityScanResult> {
  return mapSecurityScanResult(
    await apiPost<SecurityScanResponse>("/api/security/scan", body, opts),
  );
}

// --- ML (Phase 3B/3C) ------------------------------------------------------
export async function predictWorkloadRuntime(
  body: MLPredictRequestBody,
  opts?: Opts,
): Promise<MLPrediction> {
  return mapMlPrediction(
    await apiPost<MLPredictionResponse>("/api/ml/predict", body, opts),
  );
}

export function getMlModelInfo(opts?: Opts): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("/api/ml/model", opts);
}

// --- Decision Engine (Phase 3C) --------------------------------------------
export async function recommendResource(
  body: DecisionRecommendRequestBody,
  opts?: Opts,
): Promise<ResourceRecommendation> {
  return mapRecommendation(
    await apiPost<DecisionRecommendationResponse>(
      "/api/decisions/recommend",
      body,
      opts,
    ),
  );
}

// --- What-if simulation (Phase 4) ------------------------------------------
export async function runWhatIf(
  body: WhatIfRequestBody,
  opts?: Opts,
): Promise<WhatIfResult> {
  return mapWhatIf(await apiPost<WhatIfResponseBody>("/api/what-if", body, opts));
}

// If an error is a security-gate BLOCK from POST /api/workloads (403 with a
// structured detail), return it as a SecurityScanResult; otherwise null. Lets
// the workload form render the same violation panel without duplicating rules.
export function securityBlockFromError(err: unknown): SecurityScanResult | null {
  if (!(err instanceof ApiError) || err.status !== 403) return null;
  const detail = (err.data as { detail?: unknown })?.detail as
    | SecurityScanResponse
    | undefined;
  if (!detail || detail.status !== "BLOCK" || !Array.isArray(detail.violations)) {
    return null;
  }
  return mapSecurityScanResult(detail);
}
