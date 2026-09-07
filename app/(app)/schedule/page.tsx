import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Card";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { CLUSTER_NAME, getSchedulePools } from "@/lib/mock-data";

function LegendItem({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-text-secondary">
      <span className={`h-2.5 w-2.5 rounded-sm border ${tone}`} aria-hidden />
      {label}
    </span>
  );
}

export default function SchedulePage() {
  const pools = getSchedulePools();
  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Allocation timeline across GPU pools for the current simulated window."
        meta={
          <>
            <MetaItem label="Cluster" value={<span className="font-mono">{CLUSTER_NAME}</span>} />
            <MetaItem label="Window" value="12:00 – 20:00" />
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
        <ScheduleTimeline pools={pools} />
      </Panel>

      <p className="mt-3 text-2xs text-text-muted">
        Simulated allocation plan. Blocks are illustrative and are not driven by a
        live scheduler.
      </p>
    </div>
  );
}
