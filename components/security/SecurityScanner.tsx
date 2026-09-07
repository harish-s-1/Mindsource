"use client";

import { useState } from "react";
import { Loader2, ShieldQuestion, ScanLine } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { ApiErrorState } from "@/components/ui/ApiState";
import { SecurityScanResult } from "./SecurityScanResult";
import {
  scanWorkloadSecurity,
  ApiError,
  type SecurityScanRequest,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import type { SecurityScanResult as ScanResult } from "@/lib/types";

// Common Linux capabilities offered as quick toggles. The backend decides which
// are dangerous (SEC-005) — the UI does not reproduce that rule.
const CAPABILITY_OPTIONS = [
  "SYS_ADMIN",
  "NET_ADMIN",
  "SYS_PTRACE",
  "NET_RAW",
  "CHOWN",
  "ALL",
];

interface FormState {
  name: string;
  image: string;
  gpuCount: number;
  privileged: boolean;
  hostNetwork: boolean;
  hostPid: boolean;
  hostPathMounts: boolean;
  capabilities: string[];
}

const INITIAL: FormState = {
  name: "training-job",
  image: "docker.io/myteam/trainer",
  gpuCount: 2,
  privileged: false,
  hostNetwork: false,
  hostPid: false,
  hostPathMounts: false,
  capabilities: [],
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
        className="h-3.5 w-3.5 accent-accent"
        style={{ accentColor: "#37B5A8" }}
      />
      {label}
    </label>
  );
}

export function SecurityScanner() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCapability = (cap: string) =>
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter((c) => c !== cap)
        : [...f.capabilities, cap],
    }));

  const onScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const body: SecurityScanRequest = {
      name: form.name || undefined,
      image: form.image || undefined,
      privileged: form.privileged,
      host_network: form.hostNetwork,
      host_pid: form.hostPid,
      host_path_mounts: form.hostPathMounts,
      capabilities: form.capabilities,
      gpu_count: Number(form.gpuCount),
    };

    try {
      const res = await scanWorkloadSecurity(body);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError(String(err), 0, true),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Scanner form */}
      <Panel>
        <PanelHeader
          title="Workload Security Scanner"
          actions={<span className="text-2xs text-text-muted">POST /api/security/scan</span>}
        />
        <form onSubmit={onScan}>
          <PanelBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Workload name" htmlFor="sec-name" className="sm:col-span-2">
                <Input
                  id="sec-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. training-job"
                />
              </Field>
              <Field label="Container image" htmlFor="sec-image" className="sm:col-span-2">
                <Input
                  id="sec-image"
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="e.g. docker.io/myteam/trainer"
                />
              </Field>
              <Field label="GPU count" htmlFor="sec-gpu">
                <Input
                  id="sec-gpu"
                  type="number"
                  min={0}
                  value={form.gpuCount}
                  onChange={(e) => set("gpuCount", Number(e.target.value))}
                />
              </Field>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-text-secondary">
                Security configuration
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Privileged" checked={form.privileged} onChange={(v) => set("privileged", v)} />
                <Toggle label="Host network" checked={form.hostNetwork} onChange={(v) => set("hostNetwork", v)} />
                <Toggle label="Host PID" checked={form.hostPid} onChange={(v) => set("hostPid", v)} />
                <Toggle label="Host path mounts" checked={form.hostPathMounts} onChange={(v) => set("hostPathMounts", v)} />
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-text-secondary">
                Linux capabilities
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CAPABILITY_OPTIONS.map((cap) => {
                  const active = form.capabilities.includes(cap);
                  return (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => toggleCapability(cap)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-sm border px-2 py-1 font-mono text-2xs transition-colors",
                        active
                          ? "border-accent bg-accent-muted text-accent"
                          : "border-border-strong bg-surface-2 text-text-secondary hover:border-accent/40",
                      )}
                    >
                      {cap}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-2xs text-text-muted">
                The engine determines which capabilities are dangerous — the UI does not.
              </p>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning workload…
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4" />
                  Scan Workload
                </>
              )}
            </Button>
          </PanelBody>
        </form>
      </Panel>

      {/* Scan result */}
      <Panel>
        <PanelHeader title="Scan Result" />
        <PanelBody>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <div className="text-sm text-text-secondary">Scanning workload…</div>
            </div>
          ) : error ? (
            <ApiErrorState error={error} onRetry={() => setError(null)} compact />
          ) : result ? (
            <SecurityScanResult result={result} />
          ) : (
            <EmptyState
              title="No scan performed yet"
              description="Configure a workload and run Scan Workload to evaluate it against the security policies."
              icon={<ShieldQuestion className="h-5 w-5" />}
            />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
