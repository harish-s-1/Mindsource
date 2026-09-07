"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Card";
import {
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import {
  decisionStatusTone,
  decisionTypeTone,
  priorityTone,
} from "@/components/ui/tone";
import { useDemoState } from "@/context/DemoStateContext";
import { formatDeadline } from "@/lib/format";
import type { Decision } from "@/lib/types";

const TYPE = [
  "All",
  "Allocated",
  "Deferred",
  "Rescheduled",
  "Protected capacity",
  "Rejected",
];
const STATUS = ["All", "Pending", "Approved", "Applied", "Rejected"];

export function DecisionsView({ decisions }: { decisions: Decision[] }) {
  const router = useRouter();
  const { getDecisionStatus } = useDemoState();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  // Apply any local demo overrides (e.g. approved/rejected on the demo record).
  const withStatus = useMemo(
    () =>
      decisions.map((d) => ({
        ...d,
        status: getDecisionStatus(d.id, d.status),
      })),
    [decisions, getDecisionStatus],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter((d) => {
      if (type !== "All" && d.type !== type) return false;
      if (status !== "All" && d.status !== status) return false;
      if (q && !d.workloadName.toLowerCase().includes(q) && !d.reason.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [withStatus, search, type, status]);

  const columns: Column<Decision>[] = [
    {
      key: "time",
      header: "Time",
      numeric: true,
      render: (d) => <span className="text-text-secondary">{formatDeadline(d.timestamp)}</span>,
    },
    { key: "workload", header: "Workload", render: (d) => <span className="font-medium">{d.workloadName}</span> },
    {
      key: "decision",
      header: "Decision",
      render: (d) => <StatusBadge tone={decisionTypeTone(d.type)} dot={false}>{d.type}</StatusBadge>,
    },
    { key: "gpuType", header: "GPU Type", render: (d) => <span className="font-medium">{d.gpuType}</span> },
    { key: "gpuCount", header: "GPU Count", align: "right", numeric: true, render: (d) => d.gpuCount },
    {
      key: "priority",
      header: "Priority",
      render: (d) => <StatusBadge tone={priorityTone(d.priority)}>{d.priority}</StatusBadge>,
    },
    {
      key: "reason",
      header: "Reason",
      render: (d) => (
        <span className="block max-w-xs truncate text-text-secondary" title={d.reason}>
          {d.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge tone={decisionStatusTone(d.status)}>{d.status}</StatusBadge>,
    },
  ];

  return (
    <Panel>
      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search workload or reason…"
          className="w-64"
        />
        <div className="flex-1" />
        <FilterSelect label="Decision" value={type} onChange={setType} options={TYPE} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No decisions match your filters" />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(d) => d.id}
          onRowClick={(d) => router.push(`/decisions/${d.id}`)}
        />
      )}

      <div className="border-t border-border px-3 py-2 text-2xs text-text-muted">
        Showing {filtered.length} of {decisions.length} decisions · click a row for
        detail
      </div>
    </Panel>
  );
}
