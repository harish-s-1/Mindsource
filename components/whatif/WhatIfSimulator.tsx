"use client";

import { useState } from "react";
import { Play, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { EmptyState } from "@/components/ui/States";
import { formatCurrency } from "@/lib/format";
import type { BadgeTone } from "@/components/ui/StatusBadge";

interface Scenario {
  inference: number;
  training: number;
  finetune: number;
  h100: number;
  l4: number;
  t4: number;
  budget: number;
}

interface Result {
  utilization: number;
  oversubscribed: boolean;
  cost: number;
  deadlineRisk: { label: string; tone: BadgeTone };
  resourcePressure: { label: string; tone: BadgeTone };
  withinBudget: boolean;
  action: string;
}

const DEFAULT: Scenario = {
  inference: 55,
  training: 60,
  finetune: 40,
  h100: 16,
  l4: 16,
  t4: 16,
  budget: 120,
};

// Deterministic heuristic — NOT a real optimization engine. Reactive so the
// scenario feels responsive, but labeled as a simulation throughout.
function evaluate(s: Scenario): Result {
  const demandUnits = (s.training * 1.4 + s.inference * 1.0 + s.finetune * 1.1) / 10;
  const capacityUnits = Math.max(1, s.h100 * 4 + s.l4 * 1.5 + s.t4 * 1);
  const raw = (demandUnits / capacityUnits) * 100;
  const utilization = Math.min(100, Math.round(raw));
  const oversubscribed = raw > 100;

  const cost =
    Math.round(
      (s.h100 * 3.5 + s.l4 * 0.75 + s.t4 * 0.4) * (Math.min(100, raw) / 100) * 100,
    ) / 100;

  const bucket = (v: number): { label: string; tone: BadgeTone } => {
    if (v >= 100) return { label: "High", tone: "critical" };
    if (v >= 80) return { label: "Elevated", tone: "warning" };
    if (v >= 55) return { label: "Moderate", tone: "warning" };
    return { label: "Low", tone: "healthy" };
  };

  const withinBudget = cost <= s.budget;

  let action: string;
  if (oversubscribed) {
    action =
      "Demand exceeds capacity — add H100/L4 GPUs or defer flexible batch and experimentation workloads.";
  } else if (!withinBudget) {
    action =
      "Projected cost is over budget — shift demand toward L4/T4 pools or raise the budget constraint.";
  } else if (utilization < 40) {
    action =
      "Capacity is underused — consolidate onto fewer nodes to reduce simulated cost.";
  } else {
    action = "Current mix is balanced against capacity and budget; no action required.";
  }

  return {
    utilization,
    oversubscribed,
    cost,
    deadlineRisk: bucket(raw),
    resourcePressure: bucket(raw),
    withinBudget,
    action,
  };
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = `wf-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
        <span className="tabular text-xs text-text-primary">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3"
        style={{ accentColor: "#37B5A8" }}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  const id = `wf-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-full rounded-sm border border-border-strong bg-surface-2 px-2.5 text-sm tabular text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
        {suffix && <span className="text-xs text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultTile({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: BadgeTone;
  sub?: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-2xs uppercase tracking-wide text-text-muted">{label}</div>
      {tone ? (
        <div className="mt-1.5">
          <StatusBadge tone={tone} dot={false}>
            {value}
          </StatusBadge>
        </div>
      ) : (
        <div className="tabular mt-1 text-lg font-semibold text-text-primary">{value}</div>
      )}
      {sub && <div className="mt-1 text-2xs text-text-muted">{sub}</div>}
    </div>
  );
}

export function WhatIfSimulator() {
  const [scenario, setScenario] = useState<Scenario>(DEFAULT);
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);

  const set = <K extends keyof Scenario>(key: K, value: number) =>
    setScenario((s) => ({ ...s, [key]: value }));

  const simulate = () => {
    if (running) return;
    setRunning(true);
    setTimeout(() => {
      setResult(evaluate(scenario));
      setRunning(false);
    }, 900);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Controls */}
      <div className="space-y-4 lg:col-span-2">
        <Panel>
          <PanelHeader title="Demand" hint={<SimulationBadge label="SIMULATION" />} />
          <PanelBody className="space-y-4">
            <Slider label="Inference demand" value={scenario.inference} onChange={(v) => set("inference", v)} />
            <Slider label="Training demand" value={scenario.training} onChange={(v) => set("training", v)} />
            <Slider label="Fine-tuning demand" value={scenario.finetune} onChange={(v) => set("finetune", v)} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Capacity & budget" />
          <PanelBody className="grid grid-cols-2 gap-3">
            <NumberField label="Available H100" value={scenario.h100} onChange={(v) => set("h100", v)} />
            <NumberField label="Available L4" value={scenario.l4} onChange={(v) => set("l4", v)} />
            <NumberField label="Available T4" value={scenario.t4} onChange={(v) => set("t4", v)} />
            <NumberField label="Budget" value={scenario.budget} onChange={(v) => set("budget", v)} suffix="$/hr" step={10} />
          </PanelBody>
        </Panel>

        <Button variant="primary" className="w-full" onClick={simulate} disabled={running}>
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Simulating…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Simulate scenario
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <div className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Projected outcome"
            hint={<SimulationBadge label="SIMULATION" />}
          />
          {!result ? (
            <EmptyState
              title="No scenario simulated yet"
              description="Adjust the demand, capacity and budget inputs, then run the simulation to see projected outcomes."
              icon={<Play className="h-5 w-5" />}
            />
          ) : (
            <PanelBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ResultTile
                  label="Projected utilization"
                  value={`${result.utilization}%`}
                  sub={result.oversubscribed ? "oversubscribed" : "of available capacity"}
                />
                <ResultTile
                  label="Projected cost"
                  value={formatCurrency(result.cost)}
                  sub="per hour (simulated)"
                />
                <ResultTile label="Deadline risk" value={result.deadlineRisk.label} tone={result.deadlineRisk.tone} />
                <ResultTile
                  label="Resource pressure"
                  value={result.resourcePressure.label}
                  tone={result.resourcePressure.tone}
                />
                <ResultTile
                  label="Budget"
                  value={result.withinBudget ? "Within budget" : "Over budget"}
                  tone={result.withinBudget ? "healthy" : "critical"}
                />
              </div>

              <div
                className={`flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm ${
                  result.oversubscribed || !result.withinBudget
                    ? "border-warning/30 bg-warning-bg"
                    : "border-healthy/30 bg-healthy-bg"
                }`}
              >
                {result.oversubscribed || !result.withinBudget ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-healthy" />
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Recommended action
                  </div>
                  <p className="mt-0.5 text-text-secondary">{result.action}</p>
                </div>
              </div>

              <p className="text-2xs text-text-muted">
                Projections are produced by a simple illustrative heuristic, not a
                trained model or live optimization engine.
              </p>
            </PanelBody>
          )}
        </Panel>
      </div>
    </div>
  );
}
