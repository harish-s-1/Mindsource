"use client";

import { useCallback } from "react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Card";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { DecisionsView } from "@/components/decisions/DecisionsView";
import { getDecisions } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function DecisionsPage() {
  const fetcher = useCallback((signal: AbortSignal) => getDecisions({ signal }), []);
  const { data, error, loading, reload } = useApiResource(fetcher);

  return (
    <div>
      <PageHeader
        title="Decisions"
        description="Audit log of scheduling recommendations from the simulated decision layer."
        meta={<MetaItem label="Records" value={data ? String(data.length) : "—"} />}
        actions={<SimulationBadge label="DEMO DECISION" />}
      />

      {loading ? (
        <Panel>
          <ApiLoadingState rows={8} label="Loading decisions" />
        </Panel>
      ) : error || !data ? (
        <Panel>
          <ApiErrorState error={error!} onRetry={reload} />
        </Panel>
      ) : (
        <DecisionsView decisions={data} />
      )}
    </div>
  );
}
