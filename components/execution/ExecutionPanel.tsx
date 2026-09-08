"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Loader2,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Server,
  AlertTriangle,
} from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { severityTone } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import {
  createExecution,
  getExecution,
  ApiError,
  type ExecutionRequestBody,
} from "@/lib/api";
import type { Execution, ExecutionState } from "@/lib/types";

const STATE_TONE: Record<ExecutionState, BadgeTone> = {
  QUEUED: "warning",
  ASSIGNED: "warning",
  RUNNING: "accent",
  COMPLETED: "healthy",
  FAILED: "critical",
  NO_ELIGIBLE_GPU: "critical",
  BLOCKED: "critical",
};

const ACTIVE: ExecutionState[] = ["QUEUED", "ASSIGNED", "RUNNING"];

interface FormState {
  workloadType: ExecutionRequestBody["workload_type"];
  memoryMb: number;
  durationSeconds: number;
  privileged: boolean;
}

const INITIAL: FormState = {
  workloadType: "gpu_benchmark",
  memoryMb: 2048,
  durationSeconds: 30,
  privileged: false,
};

export function ExecutionPanel() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Poll while the execution is queued/assigned/running (agent progresses it).
  const poll = useCallback((id: string) => {
    pollRef.current = setTimeout(async () => {
      try {
        const next = await getExecution(id);
        setExecution(next);
        if (ACTIVE.includes(next.state)) poll(id);
      } catch {
        // transient — try again
        poll(id);
      }
    }, 2000);
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const execute = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    if (pollRef.current) clearTimeout(pollRef.current);
    const body: ExecutionRequestBody = {
      workload_name: `${form.workloadType}-${Date.now().toString().slice(-5)}`,
      workload_type: form.workloadType,
      memory_mb: Number(form.memoryMb),
      duration_seconds: Number(form.durationSeconds),
      privileged: form.privileged,
    };
    try {
      const created = await createExecution(body);
      setExecution(created);
      if (ACTIVE.includes(created.state)) poll(created.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.isNetwork
            ? "Unable to connect to MINDSource API."
            : err.message
          : "Unexpected error.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-accent" />
            Automatic GPU Execution
          </span>
        }
        hint={<StatusBadge tone="healthy" dot={false}>REAL GPU EXECUTION</StatusBadge>}
      />
      <PanelBody className="space-y-4">
        <p className="text-xs text-text-secondary">
          Route a predefined workload to the best-fit <strong>real</strong> GPU node
          (e.g. RTX 3050 / RTX 4050) through the live pipeline: Security → Decision
          Engine → Execution. Requires the node agent running on a machine with an
          NVIDIA GPU.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Workload" htmlFor="ex-type">
            <Select
              id="ex-type"
              value={form.workloadType}
              onChange={(e) =>
                set("workloadType", e.target.value as FormState["workloadType"])
              }
            >
              <option value="gpu_benchmark">GPU benchmark</option>
              <option value="matrix_multiply">Matrix multiply</option>
              <option value="cuda_stress">CUDA stress</option>
            </Select>
          </Field>
          <Field label="VRAM need (MB)" htmlFor="ex-mem">
            <Input
              id="ex-mem"
              type="number"
              min={0}
              value={form.memoryMb}
              onChange={(e) => set("memoryMb", Number(e.target.value))}
            />
          </Field>
          <Field label="Duration (s)" htmlFor="ex-dur">
            <Input
              id="ex-dur"
              type="number"
              min={1}
              max={600}
              value={form.durationSeconds}
              onChange={(e) => set("durationSeconds", Number(e.target.value))}
            />
          </Field>
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={form.privileged}
              onChange={(e) => set("privileged", e.target.checked)}
              className="h-3.5 w-3.5"
              style={{ accentColor: "#37B5A8" }}
            />
            Privileged (test block)
          </label>
        </div>

        <Button variant="primary" className="w-full" onClick={execute} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Routing…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Execute on best GPU
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 rounded-sm border border-critical/30 bg-critical-bg px-3 py-2 text-xs text-text-secondary">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-critical" />
            <span>{error}</span>
          </div>
        )}

        {execution && <ExecutionResultView execution={execution} />}
      </PanelBody>
    </Panel>
  );
}

function ExecutionResultView({ execution }: { execution: Execution }) {
  const blocked = execution.state === "BLOCKED";
  const noGpu = execution.state === "NO_ELIGIBLE_GPU";

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {/* Security */}
      {execution.security && (
        <div>
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
            Security
          </span>
          <div className="mt-1 flex items-center gap-2">
            {execution.security.status === "BLOCK" ? (
              <ShieldAlert className="h-4 w-4 text-critical" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-healthy" />
            )}
            <StatusBadge
              tone={execution.security.status === "BLOCK" ? "critical" : "healthy"}
              dot={false}
            >
              {execution.security.status}
            </StatusBadge>
            <StatusBadge tone={severityTone(execution.security.riskLevel)} dot={false}>
              Risk: {execution.security.riskLevel}
            </StatusBadge>
          </div>
          {blocked && (
            <ul className="mt-1.5 space-y-1">
              {execution.security.violations.map((v) => (
                <li key={v.ruleCode} className="text-xs text-text-secondary">
                  <span className="font-mono">{v.ruleCode}</span> — {v.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {noGpu && (
        <div className="flex items-start gap-2 rounded-sm border border-critical/30 bg-critical-bg px-3 py-2 text-xs text-text-secondary">
          <Server className="mt-0.5 h-3.5 w-3.5 shrink-0 text-critical" />
          <span>
            <strong>NO_ELIGIBLE_GPU</strong> — {execution.reason}
          </span>
        </div>
      )}

      {!blocked && !noGpu && execution.selectedGpuName && (
        <>
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
              AI resource decision
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Selected GPU</span>
              <StatusBadge tone="accent" dot={false}>
                {execution.selectedGpuName}
              </StatusBadge>
              <span className="text-text-muted">on {execution.selectedNodeId}</span>
            </div>
            {execution.explanation.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {execution.explanation.slice(1).map((r) => (
                  <li key={r} className="flex gap-1.5 text-xs text-text-secondary">
                    <span className="text-healthy">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Execution status */}
          <div className="flex items-center justify-between rounded-sm border border-border bg-surface-2 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">Execution</span>
              <StatusBadge tone={STATE_TONE[execution.state]}>
                {execution.state}
              </StatusBadge>
              {ACTIVE.includes(execution.state) && execution.state !== "RUNNING" && (
                <span className="text-2xs text-text-muted">waiting for node agent…</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-2xs text-text-muted">
              {execution.device && <span>device: {execution.device}</span>}
              {execution.lastUtilization != null && (
                <span className="tabular">GPU {execution.lastUtilization}%</span>
              )}
            </div>
          </div>
          {execution.error && (
            <p className="text-xs text-critical">Error: {execution.error}</p>
          )}
        </>
      )}

      {/* Candidate nodes */}
      {execution.candidates.length > 0 && (
        <div>
          <div className="text-2xs uppercase tracking-wide text-text-muted">
            Real GPU nodes
          </div>
          <ul className="mt-1 space-y-1">
            {execution.candidates.map((c) => {
              const isSel = c.nodeId === execution.selectedNodeId;
              return (
                <li key={c.nodeId} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "w-44 shrink-0 truncate",
                      isSel ? "font-semibold text-accent" : "text-text-secondary",
                    )}
                    title={c.gpuName}
                  >
                    {c.gpuName}
                  </span>
                  <span className="tabular w-24 shrink-0 text-text-muted">
                    {c.availableVramMb}/{c.totalVramMb}MB
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isSel ? "bg-accent" : "bg-idle",
                      )}
                      style={{ width: `${Math.round(c.score * 100)}%` }}
                    />
                  </div>
                  <span className="tabular w-9 text-right text-2xs text-text-secondary">
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
      )}
    </div>
  );
}
