"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { WorkloadsView } from "@/components/workloads/WorkloadsView";
import { getWorkloads } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function WorkloadsPage() {
  const fetcher = useCallback((signal: AbortSignal) => getWorkloads({ signal }), []);
  const { data, error, loading, reload } = useApiResource(fetcher);

  return (
    <div>
      <PageHeader
        title="Workloads"
        description="AI compute workloads across teams in the simulated cluster."
        meta={<MetaItem label="Total" value={data ? String(data.length) : "—"} />}
        actions={
          <>
            <SimulationBadge label="SIMULATION" />
            <Link href="/workloads/new">
              <Button variant="primary" size="md">
                <Plus className="h-4 w-4" />
                New workload
              </Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <Panel>
          <ApiLoadingState rows={8} label="Loading workloads" />
        </Panel>
      ) : error || !data ? (
        <Panel>
          <ApiErrorState error={error!} onRetry={reload} />
        </Panel>
      ) : (
        <WorkloadsView workloads={data} />
      )}
    </div>
  );
}
