"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { MetricRow, MetricTile } from "@/components/ui/MetricTile";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { UtilizationBar } from "@/components/ui/UtilizationBar";
import { UtilizationChart } from "@/components/charts/UtilizationChart";
import { DistributionBars } from "@/components/charts/DistributionBars";
import {
  ApiErrorState,
  ApiLoadingState,
  ApiMetricSkeleton,
} from "@/components/ui/ApiState";
import {
  decisionTypeTone,
  priorityTone,
  workloadStatusTone,
} from "@/components/ui/tone";
import { getDecisions, getInfrastructure, getWorkloads } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { workloadDistribution } from "@/lib/derive";
import { getSystemStatus, getUtilizationTrend } from "@/lib/mock-data";
import { formatCurrencyWhole, formatDeadline } from "@/lib/format";
import type {
  Decision,
  GpuInventory,
  InfrastructureData,
  Workload,
} from "@/lib/types";

// Simulated, static presentational data the backend does not yet provide.
const TREND = getUtilizationTrend();
const SYSTEM_STATUS = getSystemStatus();

interface OverviewData {
  infra: InfrastructureData;
  workloads: Workload[];
  decisions: Decision[];
}

const inventoryColumns: Column<GpuInventory>[] = [
  { key: "type", header: "GPU Type", render: (r) => <span className="font-medium">{r.gpuType}</span> },
  { key: "total", header: "Total", align: "right", numeric: true, render: (r) => r.total },
  { key: "alloc", header: "Allocated", align: "right", numeric: true, render: (r) => r.allocated },
  {
    key: "avail",
    header: "Available",
    align: "right",
    numeric: true,
    render: (r) => (
      <span className={r.available === 0 ? "text-warning" : "text-healthy"}>{r.available}</span>
    ),
  },
  {
    key: "util",
    header: "Utilization",
    align: "right",
    render: (r) => <UtilizationBar value={r.utilization} className="justify-end" />,
  },
];

const workloadColumns: Column<Workload>[] = [
  { key: "name", header: "Workload", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type", header: "Type", render: (r) => <span className="text-text-secondary">{r.type}</span> },
  {
    key: "gpu",
    header: "GPU",
    numeric: true,
    render: (r) => (
      <span>
        {r.gpuRequested} × {r.gpuType}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    render: (r) => <StatusBadge tone={priorityTone(r.priority)}>{r.priority}</StatusBadge>,
  },
  {
    key: "deadline",
    header: "Deadline",
    numeric: true,
    render: (r) => <span className="text-text-secondary">{formatDeadline(r.deadline)}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge tone={workloadStatusTone(r.status)}>{r.status}</StatusBadge>,
  },
];

export function OverviewView() {
  const fetcher = useCallback(async (signal: AbortSignal): Promise<OverviewData> => {
    const [infra, workloads, decisions] = await Promise.all([
      getInfrastructure({ signal }),
      getWorkloads({ signal }),
      getDecisions({ signal }),
    ]);
    return { infra, workloads, decisions };
  }, []);

  const { data, error, loading, reload } = useApiResource(fetcher);

  const header = (
    <PageHeader
      title="Overview"
      description="Fleet-level status for the simulated AI compute cluster."
      meta={
        <>
          <MetaItem
            label="Cluster"
            value={<span className="font-mono">{data?.infra.cluster ?? "—"}</span>}
          />
          <MetaItem label="Environment" value={data?.infra.environment ?? "—"} />
          <MetaItem label="Nodes" value={data ? String(data.infra.nodeCount) : "—"} />
        </>
      }
    />
  );

  if (loading) {
    return (
      <div>
        {header}
        <ApiMetricSkeleton />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <ApiLoadingState rows={4} />
          </Panel>
          <Panel>
            <ApiLoadingState rows={4} />
          </Panel>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        {header}
        <Panel>
          <ApiErrorState error={error!} onRetry={reload} />
        </Panel>
      </div>
    );
  }

  const { infra, workloads, decisions } = data;
  const distribution = workloadDistribution(workloads);
  const currentWorkloads = workloads
    .filter((w) => w.status === "Running" || w.status === "Queued")
    .slice(0, 8);
  const recentDecisions = decisions.slice(0, 4);

  return (
    <div>
      {header}

      <MetricRow>
        <MetricTile label="Total GPUs" value={infra.metrics.totalGpus} sub="across 4 pools" />
        <MetricTile
          label="Available GPUs"
          value={infra.metrics.availableGpus}
          tone={infra.metrics.availableGpus < 8 ? "warning" : "healthy"}
          sub={`${infra.metrics.allocatedGpus} allocated`}
        />
        <MetricTile
          label="GPU Utilization"
          value={infra.metrics.gpuUtilization}
          unit="%"
          tone="neutral"
          sub="allocated / total"
        />
        <MetricTile label="Active Workloads" value={infra.metrics.activeWorkloads} sub="running now" />
        <MetricTile
          label="Queued Workloads"
          value={infra.metrics.queuedWorkloads}
          tone={infra.metrics.queuedWorkloads > 0 ? "warning" : "neutral"}
          sub="queued + waiting"
        />
        <MetricTile
          label="Est. Compute Cost"
          value={formatCurrencyWhole(infra.metrics.estimatedHourlyCost)}
          unit="/hr"
          sub="simulated rate card"
        />
      </MetricRow>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="GPU Resource Overview" hint={<SimulationBadge label="SIMULATION" />} />
          <DataTable columns={inventoryColumns} rows={infra.inventory} getRowKey={(r) => r.gpuType} />
        </Panel>

        <Panel>
          <PanelHeader title="Workload Distribution" hint={<SimulationBadge label="SIMULATION" />} />
          <PanelBody>
            <DistributionBars data={distribution} />
          </PanelBody>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="GPU Utilization Trend"
            hint={<SimulationBadge label="SIMULATION" />}
            actions={<span className="text-2xs text-text-muted">Static series — not from API</span>}
          />
          <PanelBody>
            <UtilizationChart data={TREND} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="System Status" hint={<SimulationBadge label="SIMULATION" />} />
          <ul className="divide-y divide-border">
            {SYSTEM_STATUS.map((item) => (
              <li key={item.label} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="text-sm text-text-primary">{item.label}</div>
                  <div className="text-2xs text-text-muted">{item.detail}</div>
                </div>
                <StatusBadge tone="warning">{item.state}</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Current Workloads"
            actions={
              <Link href="/workloads" className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover">
                All workloads <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          <DataTable columns={workloadColumns} rows={currentWorkloads} getRowKey={(r) => r.id} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent Scheduling Decisions"
            hint={<SimulationBadge label="DEMO DECISION" />}
            actions={
              <Link href="/decisions" className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover">
                Audit log <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {recentDecisions.length === 0 ? (
            <PanelBody>
              <p className="text-xs text-text-muted">No decisions recorded.</p>
            </PanelBody>
          ) : (
            <ul className="divide-y divide-border">
              {recentDecisions.map((d) => (
                <li key={d.id} className="px-4 py-2.5">
                  <Link href={`/decisions/${d.id}`} className="group block">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={decisionTypeTone(d.type)} dot={false}>
                        {d.type}
                      </StatusBadge>
                      <span className="text-xs font-medium text-text-primary group-hover:text-accent">
                        {d.gpuCount} × {d.gpuType}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{d.reason}</div>
                    <div className="mt-0.5 text-2xs text-text-muted">
                      {d.workloadName} · {formatDeadline(d.timestamp)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
