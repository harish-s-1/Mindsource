"use client";

import { useState } from "react";
import {
  Play,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Server,
} from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { Field, Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { ApiErrorState } from "@/components/ui/ApiState";
import { severityTone } from "@/components/ui/tone";
import { runWhatIf, ApiError, type WhatIfRequestBody } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { GpuType, WhatIfResult } from "@/lib/types";

// Human-readable labels for the model's real feature names.
const FEATURE_LABELS: Record<string, string> = {
  num_gpus: "GPU count",
  num_servers: "Server count",
  gpus_per_server: "GPUs per server",
  is_distributed: "Distributed job",
  submit_hour: "Submit hour",
  submit_dow: "Submit day",
  vc_freq: "Queue activity",
};

function formatRuntime(minutes: number): string {
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  return `~${(minutes / 60).toFixed(1)} h (${Math.round(minutes)} min)`;
}

interface FormState {
  gpuCount: number;
  gpuType: GpuType;
  image: string;
  privileged: boolean;
  hostNetwork: boolean;
}

const INITIAL: FormState = {
  gpuCount: 2,
  gpuType: "L4",
  image: "docker.io/myteam/trainer",
  privileged: false,
  hostNetwork: false,
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-surface-2 px-2.5 py-2 text-xs text-text-secondary hover:border-accent/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5"
        style={{ accentColor: "#37B5A8" }}
      />
      {label}
    </label>
  );
}

export function WhatIfSimulator() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // One backend calculation per click — no requests while typing.
  const runSimulation = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    const body: WhatIfRequestBody = {
      gpu_requested: Number(form.gpuCount),
      gpu_type: form.gpuType,
      image: form.image || undefined,
      privileged: form.privileged,
      host_network: form.hostNetwork,
    };
    try {
      setResult(await runWhatIf(body));
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(String(err), 0, true));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Controls */}
      <div className="space-y-4 lg:col-span-2">
        <Panel>
          <PanelHeader
            title="Hypothetical workload"
            hint={<SimulationBadge label="SIMULATION" />}
          />
          <PanelBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GPU count" htmlFor="wf-gpu">
                <Input
                  id="wf-gpu"
                  type="number"
                  min={1}
                  max={64}
                  value={form.gpuCount}
                  onChange={(e) => set("gpuCount", Number(e.target.value))}
                />
              </Field>
              <Field label="GPU type" htmlFor="wf-type" hint="Requested preference.">
                <Select
                  id="wf-type"
                  value={form.gpuType}
                  onChange={(e) => set("gpuType", e.target.value as GpuType)}
                >
                  <option>H100</option>
                  <option>A100</option>
                  <option>L4</option>
                  <option>T4</option>
                </Select>
              </Field>
            </div>

            <Field label="Container image" htmlFor="wf-image" hint="Approved registry required (docker.io, ghcr.io, nvcr.io).">
              <Input
                id="wf-image"
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="e.g. docker.io/myteam/trainer"
              />
            </Field>

            <div>
              <div className="mb-1.5 text-xs font-medium text-text-secondary">
                Security configuration
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Privileged" checked={form.privileged} onChange={(v) => set("privileged", v)} />
                <Toggle label="Host network" checked={form.hostNetwork} onChange={(v) => set("hostNetwork", v)} />
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={runSimulation} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running simulation…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Run simulation
                </>
              )}
            </Button>

            <p className="text-2xs text-text-muted">
              Runs the real pipeline — Security → XGBoost → Decision Engine — over
              current infrastructure. Hypothetical only: no workload is created.
            </p>
          </PanelBody>
        </Panel>
      </div>

      {/* Result */}
      <div className="lg:col-span-3">
        <Panel>
          <PanelHeader title="Simulation result" hint={<SimulationBadge label="WHAT-IF SIMULATION" />} />
          {error ? (
            <ApiErrorState error={error} onRetry={runSimulation} />
          ) : running ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <div className="text-sm text-text-secondary">Running simulation…</div>
            </div>
          ) : !result ? (
            <EmptyState
              title="No simulation run yet"
              description="Configure a hypothetical workload and run the simulation to see the security result, prediction and resource recommendation."
              icon={<Play className="h-5 w-5" />}
            />
          ) : (
            <PanelBody className="space-y-4">
              <WhatIfResultView result={result} />
              <p className="border-t border-border pt-2 text-2xs text-text-muted">
                Hypothetical recommendation — no workload was created and no GPU
                capacity was allocated.
              </p>
            </PanelBody>
          )}
        </Panel>
      </div>
    </div>
  );
}

function WhatIfResultView({ result }: { result: WhatIfResult }) {
  const { security, recommendation } = result;
  const blocked = security.status === "BLOCK";
  const recommended =
    recommendation?.candidates.find(
      (c) => c.resource === recommendation.recommendedResource,
    ) ?? null;

  return (
    <div className="space-y-4">
      {/* Security */}
      <section>
        <div className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
          Security
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {blocked ? (
            <ShieldAlert className="h-4 w-4 text-critical" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-healthy" />
          )}
          <StatusBadge tone={blocked ? "critical" : "healthy"} dot={false}>
            {security.status}
          </StatusBadge>
          <StatusBadge tone={severityTone(security.riskLevel)} dot={false}>
            Risk: {security.riskLevel}
          </StatusBadge>
        </div>
        {blocked && (
          <ul className="mt-2 space-y-2">
            {security.violations.map((v) => (
              <li key={v.ruleCode} className="rounded-sm border border-border bg-surface-2 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-medium text-text-primary">{v.ruleCode}</span>
                  <StatusBadge tone={severityTone(v.severity)} dot={false}>{v.severity}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-text-secondary">{v.message}</p>
              </li>
            ))}
          </ul>
        )}
        {blocked && (
          <p className="mt-2 text-xs text-text-secondary">
            Blocked by policy — the simulation stops here. No prediction or resource
            recommendation is produced for a blocked workload.
          </p>
        )}
      </section>

      {/* PASS: prediction + recommendation */}
      {!blocked && recommendation && (
        <>
          <section className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
                AI Prediction
              </span>
              <span className="rounded-sm border border-border-strong bg-surface px-1.5 py-0.5 text-2xs text-text-secondary">
                XGBoost
              </span>
            </div>
            {recommendation.prediction ? (
              <>
                <p className="mt-1 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">XGBoost predicted</span>{" "}
                  an expected runtime of{" "}
                  <span className="tabular font-semibold text-text-primary">
                    {formatRuntime(recommendation.prediction.prediction)}
                  </span>
                  .
                </p>
                {recommendation.prediction.topFeatures.length > 0 && (
                  <p className="mt-1 text-2xs text-text-muted">
                    Top factors:{" "}
                    {recommendation.prediction.topFeatures
                      .map((f) => FEATURE_LABELS[f] ?? f)
                      .join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-warning">
                ML model unavailable — no prediction. Recommendation below is based
                on current capacity only.
              </p>
            )}
          </section>

          <section className="border-t border-border pt-3">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
              Resource recommendation
            </span>
            {recommendation.recommendedResource ? (
              <>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">Decision Engine recommended</span>
                  <StatusBadge tone="accent" dot={false}>
                    {recommendation.recommendedResource}
                  </StatusBadge>
                  {recommended && (
                    <span className="tabular text-text-muted">
                      score {recommended.score.toFixed(2)}
                    </span>
                  )}
                </p>

                {recommended && recommended.reasons.length > 0 && (
                  <div className="mt-2">
                    <div className="text-2xs uppercase tracking-wide text-text-muted">Why?</div>
                    <ul className="mt-1 space-y-0.5">
                      {recommended.reasons.map((r) => (
                        <li key={r} className="flex gap-1.5 text-xs text-text-secondary">
                          <span className="text-healthy">✓</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-2xs uppercase tracking-wide text-text-muted">Alternatives</div>
                  <ul className="mt-1 space-y-1">
                    {recommendation.candidates.map((c) => {
                      const isRec = c.resource === recommendation.recommendedResource;
                      return (
                        <li key={c.resource} className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-44 shrink-0 truncate text-xs",
                              isRec ? "font-semibold text-accent" : "text-text-secondary",
                            )}
                            title={c.resource}
                          >
                            {c.resource}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className={cn("h-full rounded-full", isRec ? "bg-accent" : "bg-idle")}
                              style={{ width: `${Math.round(c.score * 100)}%` }}
                            />
                          </div>
                          <span className="tabular w-10 text-right text-2xs text-text-secondary">
                            {c.score.toFixed(2)}
                          </span>
                          <StatusBadge tone={c.eligible ? "healthy" : "idle"} dot={false}>
                            {c.eligible ? "ELIGIBLE" : "INELIGIBLE"}
                          </StatusBadge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                <Server className="h-3.5 w-3.5" />
                No eligible resource currently satisfies the requested GPU capacity.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
