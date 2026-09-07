"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Gauge } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { SecurityScanResult } from "@/components/security/SecurityScanResult";
import {
  createWorkload,
  securityBlockFromError,
  ApiError,
  type WorkloadCreateRequest,
} from "@/lib/api";
import { severityTone, workloadStatusTone } from "@/components/ui/tone";
import type {
  GpuType,
  MLPrediction,
  Priority,
  ResourceRecommendation,
  SecurityScanResult as ScanResult,
  Workload,
  WorkloadType,
} from "@/lib/types";

// Human-readable labels for the model's raw feature names (kept honest —
// these are the actual features the model was trained on).
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
  const h = minutes / 60;
  return `~${h.toFixed(1)} h (${Math.round(minutes)} min)`;
}

function AIResourceIntelligence({
  prediction,
  recommendation,
}: {
  prediction: MLPrediction | null;
  recommendation: ResourceRecommendation | null;
}) {
  if (!prediction && !recommendation) {
    return (
      <div className="rounded-md border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          <Gauge className="h-4 w-4 text-text-muted" />
          AI Resource Intelligence
        </div>
        <p className="mt-1 text-2xs text-text-muted">
          Unavailable — the XGBoost model has not been trained yet. Train it
          offline: <span className="font-mono">python -m src.train</span>.
        </p>
      </div>
    );
  }

  const recommended = recommendation?.candidates.find(
    (c) => c.resource === recommendation.recommendedResource,
  );

  return (
    <div className="rounded-md border border-accent/30 bg-accent-muted/40 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
        <Gauge className="h-4 w-4 text-accent" />
        AI Resource Intelligence
      </div>

      {/* Prediction (XGBoost) */}
      {prediction && (
        <div className="mt-3 border-t border-border pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
              Prediction
            </span>
            <span className="rounded-sm border border-border-strong bg-surface px-1.5 py-0.5 text-2xs text-text-secondary">
              {prediction.model}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            <span className="font-medium text-text-primary">XGBoost predicted</span>{" "}
            an expected runtime of{" "}
            <span className="tabular font-semibold text-text-primary">
              {formatRuntime(prediction.prediction)}
            </span>
            .
          </p>
          {prediction.topFeatures.length > 0 && (
            <p className="mt-1 text-2xs text-text-muted">
              Top factors:{" "}
              {prediction.topFeatures
                .map((f) => FEATURE_LABELS[f] ?? f)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* Resource recommendation (Decision Engine) */}
      {recommendation && (
        <div className="mt-3 border-t border-border pt-2.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
            Resource recommendation
          </span>
          {recommendation.recommendedResource ? (
            <>
              <p className="mt-1 text-xs text-text-secondary">
                <span className="font-medium text-text-primary">
                  Decision Engine recommended
                </span>{" "}
                <StatusBadge tone="accent" dot={false}>
                  {recommendation.recommendedResource}
                </StatusBadge>
              </p>

              {recommended && recommended.reasons.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {recommended.reasons.map((r) => (
                    <li key={r} className="flex gap-1.5 text-xs text-text-secondary">
                      <span className="text-healthy">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2.5">
                <div className="text-2xs uppercase tracking-wide text-text-muted">
                  Alternatives (score)
                </div>
                <ul className="mt-1 space-y-1">
                  {recommendation.candidates.map((c) => {
                    const isRec = c.resource === recommendation.recommendedResource;
                    return (
                      <li key={c.resource} className="flex items-center gap-2">
                        <span
                          className={`w-40 shrink-0 truncate text-xs ${
                            isRec ? "font-semibold text-accent" : "text-text-secondary"
                          }`}
                          title={c.resource}
                        >
                          {c.resource}
                          {!c.eligible && (
                            <span className="ml-1 text-2xs text-text-muted">
                              (ineligible)
                            </span>
                          )}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className={`h-full rounded-full ${isRec ? "bg-accent" : "bg-idle"}`}
                            style={{ width: `${Math.round(c.score * 100)}%` }}
                          />
                        </div>
                        <span className="tabular w-10 text-right text-2xs text-text-secondary">
                          {c.score.toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-text-secondary">
              No resource has enough available capacity for this request.
            </p>
          )}
        </div>
      )}

      <p className="mt-2.5 border-t border-border pt-2 text-2xs text-text-muted">
        Prediction from a model trained on publicly available production
        GPU-cluster traces (<span className="text-text-secondary">historical data</span>);
        recommendation from MINDSource&apos;s live infrastructure state. Not your
        RTX 3050 telemetry.
      </p>
    </div>
  );
}

interface FormState {
  name: string;
  team: string;
  type: WorkloadType;
  image: string;
  gpuCount: number;
  gpuType: GpuType;
  memoryGb: number;
  durationHours: number;
  priority: Priority;
  deadline: string; // datetime-local value
}

const INITIAL: FormState = {
  name: "Vision Fine-tune",
  team: "Perception",
  type: "Fine-tuning",
  image: "docker.io/myteam/trainer",
  gpuCount: 4,
  gpuType: "L4",
  memoryGb: 96,
  durationHours: 3,
  priority: "Medium",
  deadline: "2026-09-07T21:00",
};

// Convert the datetime-local value to an ISO 8601 string the backend stores.
function toIso(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toISOString();
}

export function NewWorkloadForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Workload | null>(null);
  const [blocked, setBlocked] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setBlocked(null);

    // Only `image` is sent for the security gate; the other security fields use
    // their safe backend defaults (no security questionnaire on this form).
    const body: WorkloadCreateRequest = {
      name: form.name,
      team: form.team,
      type: form.type,
      image: form.image || undefined,
      gpu_requested: Number(form.gpuCount),
      gpu_type: form.gpuType,
      memory_gb: Number(form.memoryGb),
      duration_hours: Number(form.durationHours),
      priority: form.priority,
      deadline: toIso(form.deadline),
    };

    try {
      const workload = await createWorkload(body);
      setCreated(workload);
    } catch (err) {
      // A security-gate BLOCK (403) is not a failure — surface the violations.
      const block = securityBlockFromError(err);
      if (block) {
        setBlocked(block);
      } else {
        setError(
          err instanceof ApiError
            ? err.isNetwork
              ? "Unable to connect to MINDSource API — the workload was not submitted."
              : err.message
            : "Unexpected error submitting the workload.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Success state -------------------------------------------------------
  if (created) {
    const risk = created.securityRisk ?? "LOW";
    const secStatus = created.securityStatus ?? "PASS";
    return (
      <Panel className="max-w-xl">
        <PanelHeader title="Workload submitted" />
        <PanelBody className="space-y-4">
          {/* Automatic security validation happened before creation. */}
          <div className="flex items-center justify-between gap-3 rounded-sm border border-healthy/30 bg-healthy-bg px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-text-primary">
              <ShieldCheck className="h-4 w-4 text-healthy" />
              Security check
            </span>
            <span className="flex items-center gap-1.5">
              <StatusBadge tone="healthy" dot={false}>
                {secStatus}
              </StatusBadge>
              <StatusBadge tone={severityTone(risk)} dot={false}>
                {risk}
              </StatusBadge>
            </span>
          </div>

          {/* AI Resource Intelligence — ML prediction + Decision Engine. */}
          <AIResourceIntelligence
            prediction={created.mlPrediction ?? null}
            recommendation={created.resourceRecommendation ?? null}
          />

          <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-2 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-healthy" />
            <div className="text-xs text-text-secondary">
              The workload passed the security policy gate and was saved as{" "}
              <span className="font-medium text-text-primary">queued</span>. It
              has not been assigned to a node — resource selection is a later phase.
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <Row label="Workload ID">
              <span className="font-mono text-text-primary">{created.id}</span>
            </Row>
            <Row label="Name">{created.name}</Row>
            <Row label="Team">{created.team}</Row>
            <Row label="Request">
              {created.gpuRequested} × {created.gpuType} · {created.memoryGb} GB
            </Row>
            <Row label="Status">
              <StatusBadge tone={workloadStatusTone(created.status)}>
                {created.status}
              </StatusBadge>
            </Row>
          </dl>

          <div className="flex items-center gap-2 pt-1">
            <Link href="/workloads">
              <Button variant="primary">View workloads</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setCreated(null);
                setForm(INITIAL);
              }}
            >
              Create another
            </Button>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  // --- Form (+ block panel when the gate rejects) --------------------------
  return (
    <div className="space-y-4">
      {blocked && (
        <Panel className="border-critical/30">
          <PanelHeader
            title="Security validation"
            hint={
              <span className="text-2xs text-text-muted">
                automatic · POST /api/workloads
              </span>
            }
          />
          <PanelBody className="space-y-3">
            <p className="text-xs text-text-secondary">
              This workload violates organizational security policy and was{" "}
              <span className="font-medium text-critical">not created</span>.
              Correct the highlighted issues and submit again.
            </p>
            <SecurityScanResult result={blocked} />
          </PanelBody>
        </Panel>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Workload definition" />
          <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Workload name" htmlFor="name" className="sm:col-span-2">
              <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Vision Fine-tune" />
            </Field>

            <Field label="Container image" htmlFor="image" className="sm:col-span-2" hint="Must come from an approved registry (e.g. docker.io, ghcr.io, nvcr.io).">
              <Input id="image" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="e.g. docker.io/myteam/trainer" />
            </Field>

            <Field label="Team" htmlFor="team">
              <Input id="team" required value={form.team} onChange={(e) => set("team", e.target.value)} placeholder="e.g. Perception" />
            </Field>

            <Field label="Workload type" htmlFor="type">
              <Select id="type" value={form.type} onChange={(e) => set("type", e.target.value as WorkloadType)}>
                <option>Training</option>
                <option>Inference</option>
                <option>Fine-tuning</option>
                <option>Batch</option>
                <option>Experimentation</option>
              </Select>
            </Field>

            <Field label="GPU count" htmlFor="gpuCount">
              <Input id="gpuCount" type="number" min={1} max={64} value={form.gpuCount} onChange={(e) => set("gpuCount", Number(e.target.value))} />
            </Field>

            <Field label="GPU type" htmlFor="gpuType" hint="Requested accelerator type.">
              <Select id="gpuType" value={form.gpuType} onChange={(e) => set("gpuType", e.target.value as GpuType)}>
                <option>H100</option>
                <option>A100</option>
                <option>L4</option>
                <option>T4</option>
              </Select>
            </Field>

            <Field label="GPU memory requirement" htmlFor="memory" hint="In GB.">
              <Input id="memory" type="number" min={1} value={form.memoryGb} onChange={(e) => set("memoryGb", Number(e.target.value))} />
            </Field>

            <Field label="Expected duration" htmlFor="duration" hint="In hours (0 = continuous).">
              <Input id="duration" type="number" min={0} value={form.durationHours} onChange={(e) => set("durationHours", Number(e.target.value))} />
            </Field>

            <Field label="Priority" htmlFor="priority">
              <Select id="priority" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </Select>
            </Field>

            <Field label="Deadline" htmlFor="deadline">
              <Input id="deadline" type="datetime-local" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </Field>
          </PanelBody>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Submit" hint={<SimulationBadge label="SIMULATION" />} />
            <PanelBody>
              <p className="text-xs text-text-secondary">
                Submitting sends this workload to the MINDSource backend
                (<span className="font-mono">POST /api/workloads</span>). It is
                automatically evaluated by the deterministic security policy
                engine before anything is saved — unsafe workloads are blocked
                and never persisted.
              </p>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-sm border border-critical/30 bg-critical-bg px-3 py-2 text-xs text-text-secondary">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-critical" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" variant="primary" className="mt-4 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating &amp; submitting…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit workload
                  </>
                )}
              </Button>

              <p className="mt-2 text-center text-2xs text-text-muted">
                Security validation runs automatically — no manual scan needed.
              </p>
            </PanelBody>
          </Panel>

          <p className="px-1 text-2xs text-text-muted">
            A passing workload is persisted as a queued record. It is not
            analyzed, scheduled, or assigned — that is a later phase.
          </p>
        </div>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-text-secondary">{children}</dd>
    </div>
  );
}
