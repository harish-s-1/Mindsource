"use client";

import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { UtilizationBar } from "@/components/ui/UtilizationBar";
import { nodeStatusTone, workloadStatusTone } from "@/components/ui/tone";
import { SourceBadge } from "./SourceBadge";
import { formatRelative } from "@/lib/format";
import type { Node, Workload } from "@/lib/types";

function Stat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 px-3 py-2">
      <div className="text-2xs uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`tabular mt-1 font-semibold text-text-primary ${
          small ? "text-sm" : "text-lg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function NodeDrawer({
  node,
  workloads,
  onClose,
}: {
  node: Node | null;
  workloads: Workload[];
  onClose: () => void;
}) {
  // Resolve the node's running workloads from the API workload list.
  const nodeWorkloads = node
    ? workloads.filter((w) => w.nodeId === node.id)
    : [];
  const isLive = !!node && node.source !== "simulated";
  const memText =
    node && node.memoryUsedMb != null && node.memoryTotalMb != null
      ? `${node.memoryUsedMb.toLocaleString()} / ${node.memoryTotalMb.toLocaleString()} MB`
      : "—";

  return (
    <Drawer
      open={!!node}
      onClose={onClose}
      title={<span className="font-mono">{node?.name}</span>}
      subtitle={
        node ? (
          <span className="flex items-center gap-2">
            {node.gpuType} · {node.region}
            {isLive ? (
              <SourceBadge source={node.source} liveStatus={node.liveStatus} />
            ) : (
              <SimulationBadge label="SIMULATION" />
            )}
          </span>
        ) : undefined
      }
      footer={
        node ? (
          <div className="flex items-center justify-between text-xs">
            {isLive ? (
              <>
                <span className="text-text-muted">
                  Last seen{" "}
                  <span className="text-text-secondary">
                    {node.lastSeen ? formatRelative(node.lastSeen) : "—"}
                  </span>
                </span>
                <SourceBadge source={node.source} liveStatus={node.liveStatus} />
              </>
            ) : (
              <>
                <span className="text-text-muted">Node health</span>
                <StatusBadge tone={nodeStatusTone(node.status)}>{node.status}</StatusBadge>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      {node && (
        <div className="space-y-5">
          {isLive && node.gpuName && (
            <div className="rounded-sm border border-healthy/25 bg-healthy-bg px-3 py-2">
              <div className="text-2xs uppercase tracking-wide text-text-muted">
                Live GPU · {node.source}
              </div>
              <div className="mt-1 text-sm font-semibold text-text-primary">
                {node.gpuName}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {isLive ? (
              <>
                <Stat label="GPU count" value={node.totalGpus} />
                <Stat
                  label="Temperature"
                  value={node.temperatureC != null ? `${node.temperatureC}°C` : "—"}
                />
                <Stat label="Memory" value={memText} small />
                <Stat label="Utilization" value={`${node.utilization}%`} />
              </>
            ) : (
              <>
                <Stat label="GPU type" value={node.gpuType} />
                <Stat label="GPU count" value={node.totalGpus} />
                <Stat label="Allocated" value={node.allocatedGpus} />
                <Stat
                  label="Available"
                  value={
                    <span className={node.availableGpus === 0 ? "text-warning" : "text-healthy"}>
                      {node.availableGpus}
                    </span>
                  }
                />
              </>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                <span>GPU utilization</span>
              </div>
              <UtilizationBar value={node.utilization} className="[&>div:first-child]:w-full" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                <span>Memory utilization</span>
              </div>
              <UtilizationBar
                value={node.memoryUtilization}
                className="[&>div:first-child]:w-full"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {isLive ? "Observed hardware" : "Current workloads"}
            </div>
            {isLive ? (
              <div className="rounded-sm border border-dashed border-border px-3 py-3 text-xs text-text-muted">
                MINDSource observes this node via the {node.source} connector
                (telemetry only). It does not manage workload allocation on
                customer-owned hardware in this phase.
              </div>
            ) : nodeWorkloads.length === 0 ? (
              <div className="rounded-sm border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
                No workloads currently allocated on this node.
              </div>
            ) : (
              <ul className="space-y-2">
                {nodeWorkloads.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {w.name}
                      </div>
                      <div className="text-2xs text-text-muted">
                        {w.team} · {w.gpuRequested} × {w.gpuType} · {w.memoryGb} GB
                      </div>
                    </div>
                    <StatusBadge tone={workloadStatusTone(w.status)}>{w.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
