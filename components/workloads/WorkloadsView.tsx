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
import { EmptyState } from "@/components/ui/States";
import { priorityTone, workloadStatusTone } from "@/components/ui/tone";
import { formatDeadline, formatDuration } from "@/lib/format";
import type { Workload } from "@/lib/types";

const STATUS = ["All", "Running", "Queued", "Waiting", "Completed"];
const PRIORITY = ["All", "Critical", "High", "Medium", "Low"];
const TYPE = ["All", "Training", "Inference", "Fine-tuning", "Batch", "Experimentation"];
const GPU = ["All", "H100", "A100", "L4", "T4"];

export function WorkloadsView({ workloads }: { workloads: Workload[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [type, setType] = useState("All");
  const [gpu, setGpu] = useState("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workloads.filter((w) => {
      if (status !== "All" && w.status !== status) return false;
      if (priority !== "All" && w.priority !== priority) return false;
      if (type !== "All" && w.type !== type) return false;
      if (gpu !== "All" && w.gpuType !== gpu) return false;
      if (q && !w.name.toLowerCase().includes(q) && !w.team.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [workloads, search, status, priority, type, gpu]);

  const columns: Column<Workload>[] = [
    { key: "name", header: "Workload", render: (w) => <span className="font-medium">{w.name}</span> },
    { key: "team", header: "Team", render: (w) => <span className="text-text-secondary">{w.team}</span> },
    { key: "type", header: "Type", render: (w) => <span className="text-text-secondary">{w.type}</span> },
    { key: "gpuReq", header: "GPU", align: "right", numeric: true, render: (w) => w.gpuRequested },
    { key: "gpuType", header: "GPU Type", render: (w) => <span className="font-medium">{w.gpuType}</span> },
    { key: "mem", header: "Memory", align: "right", numeric: true, render: (w) => `${w.memoryGb} GB` },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      numeric: true,
      render: (w) => <span className="text-text-secondary">{formatDuration(w.durationHours)}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      render: (w) => <StatusBadge tone={priorityTone(w.priority)}>{w.priority}</StatusBadge>,
    },
    {
      key: "deadline",
      header: "Deadline",
      numeric: true,
      render: (w) => <span className="text-text-secondary">{formatDeadline(w.deadline)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (w) => <StatusBadge tone={workloadStatusTone(w.status)}>{w.status}</StatusBadge>,
    },
  ];

  return (
    <Panel>
      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search workload or team…"
          className="w-56"
        />
        <div className="flex-1" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS} />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITY} />
        <FilterSelect label="Type" value={type} onChange={setType} options={TYPE} />
        <FilterSelect label="GPU" value={gpu} onChange={setGpu} options={GPU} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="No workloads match your filters"
          description="Adjust the filters above to widen the result set."
        />
      ) : (
        <DataTable columns={columns} rows={filtered} getRowKey={(w) => w.id} />
      )}

      <div className="border-t border-border px-3 py-2 text-2xs text-text-muted">
        Showing {filtered.length} of {workloads.length} workloads
      </div>
    </Panel>
  );
}
