"use client";

import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { UtilizationBar } from "@/components/ui/UtilizationBar";
import { nodeStatusTone, workloadStatusTone } from "@/components/ui/tone";
import { getWorkloadsForNode } from "@/lib/mock-data";
import type { Node } from "@/lib/types";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 px-3 py-2">
      <div className="text-2xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  );
}

export function NodeDrawer({
  node,
  onClose,
}: {
  node: Node | null;
  onClose: () => void;
}) {
  const workloads = node ? getWorkloadsForNode(node.id) : [];

  return (
    <Drawer
      open={!!node}
      onClose={onClose}
      title={<span className="font-mono">{node?.name}</span>}
      subtitle={
        node ? (
          <span className="flex items-center gap-2">
            {node.gpuType} · {node.region}
            <SimulationBadge label="SIMULATION" />
          </span>
        ) : undefined
      }
      footer={
        node ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Node health</span>
            <StatusBadge tone={nodeStatusTone(node.status)}>{node.status}</StatusBadge>
          </div>
        ) : undefined
      }
    >
      {node && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
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
              Current workloads
            </div>
            {workloads.length === 0 ? (
              <div className="rounded-sm border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
                No workloads currently allocated on this node.
              </div>
            ) : (
              <ul className="space-y-2">
                {workloads.map((w) => (
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
