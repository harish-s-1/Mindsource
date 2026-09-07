"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { Field, Input, Select } from "@/components/ui/Form";
import { decisionStatusTone, priorityTone } from "@/components/ui/tone";
import { useDemoState } from "@/context/DemoStateContext";
import { formatCurrency } from "@/lib/format";
import type { DecisionDetail } from "@/lib/types";

const WEIGHT_TONE = {
  High: "critical",
  Medium: "warning",
  Low: "idle",
} as const;

export function DecisionDetailView({ detail }: { detail: DecisionDetail }) {
  const { getDecisionStatus, setDecisionStatus } = useDemoState();
  const status = getDecisionStatus(detail.id, detail.status);
  const [modifying, setModifying] = useState(false);

  const decided = status === "Approved" || status === "Rejected";

  return (
    <div>
      <Link
        href="/decisions"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to decisions
      </Link>

      <PageHeader
        title={detail.workloadName}
        description={`Scheduling recommendation ${detail.id === "demo" ? "(seeded demo record)" : `· ${detail.id}`}`}
        actions={
          <div className="flex items-center gap-2">
            <SimulationBadge label="DEMO DECISION" />
            <StatusBadge tone={decisionStatusTone(status)}>{status}</StatusBadge>
          </div>
        }
      />

      {/* Confirmation banner reflecting local demo state */}
      {status === "Approved" && (
        <Banner tone="healthy" icon={<CheckCircle2 className="h-4 w-4" />}>
          Recommendation approved in this demo session. No real scheduling action
          was taken — state is local and resets on reload.
        </Banner>
      )}
      {status === "Rejected" && (
        <Banner tone="critical" icon={<XCircle className="h-4 w-4" />}>
          Recommendation rejected in this demo session. No real scheduling action
          was taken — state is local and resets on reload.
        </Banner>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Recommended allocation"
              hint={<SimulationBadge label="SIMULATED RECOMMENDATION" />}
            />
            <PanelBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KeyStat label="Allocation" value={`${detail.recommendedGpuCount} × ${detail.recommendedGpuType}`} />
              <KeyStat label="Start" value={detail.startTime} />
              <KeyStat label="Expected completion" value={detail.expectedCompletion} />
              <KeyStat label="Est. cost" value={formatCurrency(detail.estimatedCost)} sub="simulated" />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Decision factors" />
            <ul className="divide-y divide-border">
              {detail.factors.map((f) => (
                <li key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary">{f.label}</div>
                    <div className="text-xs text-text-secondary">{f.value}</div>
                  </div>
                  <StatusBadge tone={WEIGHT_TONE[f.weight]} dot={false}>
                    {f.weight} weight
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Why this decision" hint={<SimulationBadge label="DEMO DECISION" />} />
            <PanelBody>
              <ul className="space-y-2.5">
                {detail.rationale.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Panel>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Review" />
            <PanelBody className="space-y-3">
              <dl className="space-y-2 text-xs">
                <Row label="Workload">{detail.workloadName}</Row>
                <Row label="Type">{detail.type}</Row>
                <Row label="Priority">
                  <StatusBadge tone={priorityTone(detail.priority)}>{detail.priority}</StatusBadge>
                </Row>
                <Row label="Status">
                  <StatusBadge tone={decisionStatusTone(status)}>{status}</StatusBadge>
                </Row>
              </dl>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="primary"
                  onClick={() => setDecisionStatus(detail.id, "Approved")}
                  disabled={status === "Approved"}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setDecisionStatus(detail.id, "Rejected")}
                  disabled={status === "Rejected"}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setModifying((v) => !v)}
              >
                <Pencil className="h-4 w-4" />
                {modifying ? "Close modify panel" : "Modify"}
              </Button>

              {decided && (
                <button
                  onClick={() => setDecisionStatus(detail.id, detail.status)}
                  className="w-full text-center text-2xs text-text-muted hover:text-text-secondary"
                >
                  Reset demo state
                </button>
              )}
            </PanelBody>
          </Panel>

          {modifying && (
            <Panel>
              <PanelHeader title="Modify allocation" hint={<SimulationBadge label="DEMO" />} />
              <PanelBody className="space-y-3">
                <Field label="GPU type" htmlFor="mod-gpu">
                  <Select id="mod-gpu" defaultValue={detail.recommendedGpuType}>
                    <option>H100</option>
                    <option>A100</option>
                    <option>L4</option>
                    <option>T4</option>
                  </Select>
                </Field>
                <Field label="GPU count" htmlFor="mod-count">
                  <Input id="mod-count" type="number" min={1} defaultValue={detail.recommendedGpuCount} />
                </Field>
                <Field label="Start time" htmlFor="mod-start">
                  <Input id="mod-start" type="time" defaultValue={detail.startTime} />
                </Field>
                <p className="text-2xs text-text-muted">
                  This is a demo edit panel — changes are not persisted or applied
                  to any schedule.
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setModifying(false)}
                >
                  Done
                </Button>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "healthy" | "critical";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === "healthy"
      ? "border-healthy/30 bg-healthy-bg text-healthy"
      : "border-critical/30 bg-critical-bg text-critical";
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-md border px-4 py-2.5 text-xs ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-text-secondary">{children}</span>
    </div>
  );
}

function KeyStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-2xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="tabular mt-1 text-md font-semibold text-text-primary">{value}</div>
      {sub && <div className="text-2xs text-text-muted">{sub}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-text-secondary">{children}</dd>
    </div>
  );
}
