"use client";

import { Radio, Cpu, Server, Activity } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UtilizationBar } from "@/components/ui/UtilizationBar";
import { SourceBadge } from "./SourceBadge";
import { formatRelative } from "@/lib/format";
import type { ConnectorNode } from "@/lib/types";

// Phase 8: read-only "Connect Infrastructure" area. The connector is started
// from the terminal for this prototype; this panel only displays its status.
export function LiveConnectorPanel({ nodes }: { nodes: ConnectorNode[] }) {
  const anyOnline = nodes.some((n) => n.liveStatus === "online");

  return (
    <Panel className="mb-4">
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" aria-hidden />
            Connect Infrastructure
          </span>
        }
        actions={
          nodes.length > 0 ? (
            <StatusBadge tone={anyOnline ? "healthy" : "warning"}>
              {anyOnline ? "Connector online" : "Connector stale"}
            </StatusBadge>
          ) : (
            <StatusBadge tone="idle" dot={false}>
              No connector
            </StatusBadge>
          )
        }
      />

      {nodes.length === 0 ? (
        <PanelBody>
          <p className="text-xs text-text-secondary">
            No live connector is reporting. MINDSource can ingest real GPU
            telemetry from customer-owned hardware via the local connector.
          </p>
          <p className="mt-2 text-2xs text-text-muted">
            Start it from a terminal:{" "}
            <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-text-secondary">
              python connector/gpu_connector.py
            </code>
          </p>
        </PanelBody>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 [&>*]:bg-surface">
          {nodes.map((n) => (
            <div key={n.nodeId} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-text-muted" aria-hidden />
                  <span className="font-mono text-sm font-medium text-text-primary">
                    {n.hostname ?? n.name}
                  </span>
                </div>
                <SourceBadge source={n.source} liveStatus={n.liveStatus} />
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <Row icon={<Cpu className="h-3.5 w-3.5" />} label="Source">
                  NVIDIA / Local GPU · {n.source}
                </Row>
                <Row icon={<Cpu className="h-3.5 w-3.5" />} label="GPU">
                  {n.gpuName ?? "—"}
                  {n.gpuCount > 1 ? ` × ${n.gpuCount}` : ""}
                </Row>
                <Row icon={<Activity className="h-3.5 w-3.5" />} label="Utilization">
                  <span className="flex items-center gap-2">
                    <UtilizationBar value={n.utilization} showLabel={false} />
                    <span className="tabular text-text-secondary">{n.utilization}%</span>
                  </span>
                </Row>
                <Row icon={<Server className="h-3.5 w-3.5" />} label="Memory">
                  {n.memoryUsedMb != null && n.memoryTotalMb != null
                    ? `${n.memoryUsedMb.toLocaleString()} / ${n.memoryTotalMb.toLocaleString()} MB`
                    : "—"}
                </Row>
                {n.temperatureC != null && (
                  <Row icon={<Activity className="h-3.5 w-3.5" />} label="Temp">
                    {n.temperatureC}°C
                  </Row>
                )}
                <Row icon={<Radio className="h-3.5 w-3.5" />} label="Last heartbeat">
                  {n.lastSeen ? formatRelative(n.lastSeen) : "—"}
                </Row>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-text-muted">
        <span className="text-text-muted">{icon}</span>
        {label}
      </span>
      <span className="text-right font-medium text-text-secondary">{children}</span>
    </div>
  );
}
