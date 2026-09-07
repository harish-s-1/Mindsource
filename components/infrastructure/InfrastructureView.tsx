"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Card";
import {
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UtilizationBar } from "@/components/ui/UtilizationBar";
import { EmptyState } from "@/components/ui/States";
import { nodeStatusTone } from "@/components/ui/tone";
import { NodeDrawer } from "./NodeDrawer";
import { SourceBadge } from "./SourceBadge";
import type { GpuType, Node, NodeStatus, Workload } from "@/lib/types";

const GPU_TYPES: Array<GpuType | "All"> = ["All", "H100", "A100", "L4", "T4"];
const STATUSES: Array<NodeStatus | "All"> = [
  "All",
  "Healthy",
  "Degraded",
  "Offline",
];
const SOURCES = ["All", "Simulated", "Live"];

export function InfrastructureView({
  nodes,
  workloads,
}: {
  nodes: Node[];
  workloads: Workload[];
}) {
  const [search, setSearch] = useState("");
  const [gpuType, setGpuType] = useState("All");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [selected, setSelected] = useState<Node | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes.filter((n) => {
      if (gpuType !== "All" && n.gpuType !== gpuType) return false;
      if (status !== "All" && n.status !== status) return false;
      if (source === "Simulated" && n.source !== "simulated") return false;
      if (source === "Live" && n.source === "simulated") return false;
      if (q && !n.name.toLowerCase().includes(q) && !n.region.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [nodes, search, gpuType, status, source]);

  const columns: Column<Node>[] = [
    {
      key: "node",
      header: "Node",
      render: (n) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-text-primary">{n.name}</span>
          <span className="text-2xs text-text-muted">{n.region}</span>
        </div>
      ),
    },
    { key: "gpuType", header: "GPU Type", render: (n) => <span className="font-medium">{n.gpuType}</span> },
    {
      key: "source",
      header: "Source",
      render: (n) => <SourceBadge source={n.source} liveStatus={n.liveStatus} />,
    },
    { key: "total", header: "Total", align: "right", numeric: true, render: (n) => n.totalGpus },
    { key: "alloc", header: "Allocated", align: "right", numeric: true, render: (n) => n.allocatedGpus },
    {
      key: "avail",
      header: "Available",
      align: "right",
      numeric: true,
      render: (n) => (
        <span className={n.availableGpus === 0 ? "text-warning" : "text-healthy"}>
          {n.availableGpus}
        </span>
      ),
    },
    {
      key: "util",
      header: "Utilization",
      align: "right",
      render: (n) => <UtilizationBar value={n.utilization} className="justify-end" />,
    },
    {
      key: "status",
      header: "Status",
      render: (n) => (
        <StatusBadge tone={nodeStatusTone(n.status)}>{n.status}</StatusBadge>
      ),
    },
  ];

  return (
    <>
      <Panel>
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search node or region…"
            className="w-64"
          />
          <div className="flex-1" />
          <FilterSelect label="Source" value={source} onChange={setSource} options={SOURCES} />
          <FilterSelect label="GPU type" value={gpuType} onChange={setGpuType} options={GPU_TYPES} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUSES} />
        </FilterBar>

        {filtered.length === 0 ? (
          <EmptyState
            title="No nodes match your filters"
            description="Try clearing the search or changing the GPU type / status filter."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(n) => n.id}
            onRowClick={(n) => setSelected(n)}
          />
        )}

        <div className="border-t border-border px-3 py-2 text-2xs text-text-muted">
          Showing {filtered.length} of {nodes.length} nodes · click a row for node
          detail
        </div>
      </Panel>

      <NodeDrawer
        node={selected}
        workloads={workloads}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
