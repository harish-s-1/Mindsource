"use client";

import { useCallback } from "react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { getSchedule } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { CLUSTER_NAME } from "@/lib/mock-data";

function LegendItem({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-text-secondary">
      <span className={`h-2.5 w-2.5 rounded-sm border ${tone}`} aria-hidden />
      {label}
    </span>
  );
}

function fmtWindow(startHour?: number, endHour?: number) {
  if (startHour == null || endHour == null) return "—";
  const p = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${p(startHour)} – ${p(endHour)}`;
}

export default function SchedulePage() {
  const fetcher = useCallback((signal: AbortSignal) => getSchedule({ signal }), []);
  const { data, error, loading, reload } = useApiResource(fetcher);

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Allocation timeline across GPU pools for the current simulated window."
        meta={
          <>
            <MetaItem label="Cluster" value={<span className="font-mono">{data?.cluster ?? CLUSTER_NAME}</span>} />
            <MetaItem label="Window" value={fmtWindow(data?.startHour, data?.endHour)} />
          </>
        }
        actions={<SimulationBadge label="SIMULATION" />}
      />

      <Panel>
        <PanelHeader
          title="Allocation timeline"
          actions={
            <div className="flex items-center gap-3">
              <LegendItem tone="border-healthy/40 bg-healthy-bg" label="Running" />
              <LegendItem tone="border-accent/40 bg-accent-muted" label="Scheduled" />
              <LegendItem tone="border-warning/40 bg-warning-bg" label="Queued" />
            </div>
          }
        />
        {loading ? (
          <ApiLoadingState rows={6} label="Loading schedule" />
        ) : error || !data ? (
          <ApiErrorState error={error!} onRetry={reload} />
        ) : (
          <ScheduleTimeline
            pools={data.pools}
            startHour={data.startHour}
            endHour={data.endHour}
          />
        )}
      </Panel>

      <p className="mt-3 text-2xs text-text-muted">
        Simulated allocation plan. Blocks are illustrative and are not driven by a
        live scheduler.
      </p>
    </div>
  );
}
