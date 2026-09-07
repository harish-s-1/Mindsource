"use client";

import { useCallback } from "react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Card";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { InfrastructureView } from "@/components/infrastructure/InfrastructureView";
import { LiveConnectorPanel } from "@/components/infrastructure/LiveConnectorPanel";
import { getConnectorNodes, getNodes, getWorkloads } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { CLUSTER_NAME } from "@/lib/mock-data";
import type { ConnectorNode, Node, Workload } from "@/lib/types";

interface InfraData {
  nodes: Node[];
  workloads: Workload[];
  connectors: ConnectorNode[];
}

export default function InfrastructurePage() {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<InfraData> => {
      const [nodes, workloads, connectors] = await Promise.all([
        getNodes({ signal }),
        getWorkloads({ signal }),
        getConnectorNodes({ signal }),
      ]);
      return { nodes, workloads, connectors };
    },
    [],
  );
  // Poll so live GPU telemetry updates the dashboard without a manual reload.
  const { data, error, loading, reload } = useApiResource(fetcher, {
    refreshMs: 5000,
  });

  const liveCount = data?.connectors.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Infrastructure"
        description="Node and GPU resource inventory — simulated demo fleet plus any live connectors."
        meta={
          <>
            <MetaItem label="Cluster" value={<span className="font-mono">{CLUSTER_NAME}</span>} />
            <MetaItem label="Environment" value="Simulation + Live" />
            <MetaItem label="Nodes" value={data ? String(data.nodes.length) : "—"} />
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <SimulationBadge label="SIMULATION" />
            {liveCount > 0 && <StatusBadge tone="healthy">LIVE ×{liveCount}</StatusBadge>}
          </div>
        }
      />

      {loading && !data ? (
        <Panel>
          <ApiLoadingState rows={8} label="Loading nodes" />
        </Panel>
      ) : error && !data ? (
        <Panel>
          <ApiErrorState error={error} onRetry={reload} />
        </Panel>
      ) : data ? (
        <>
          <LiveConnectorPanel nodes={data.connectors} />
          <InfrastructureView nodes={data.nodes} workloads={data.workloads} />
        </>
      ) : null}
    </div>
  );
}
