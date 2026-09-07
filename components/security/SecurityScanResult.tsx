import { ShieldCheck, ShieldAlert } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { severityTone } from "@/components/ui/tone";
import type { SecurityScanResult as ScanResult } from "@/lib/types";

// Presentational only — renders whatever the backend returned. No rule logic,
// no hardcoded violation list.
export function SecurityScanResult({ result }: { result: ScanResult }) {
  const pass = result.status === "PASS";

  return (
    <div>
      <div
        className={`flex items-start gap-3 rounded-md border px-4 py-3 ${
          pass
            ? "border-healthy/30 bg-healthy-bg"
            : "border-critical/30 bg-critical-bg"
        }`}
      >
        <span className="mt-0.5 shrink-0">
          {pass ? (
            <ShieldCheck className="h-5 w-5 text-healthy" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-critical" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-semibold ${pass ? "text-healthy" : "text-critical"}`}
            >
              {pass ? "SECURITY PASS" : "WORKLOAD BLOCKED"}
            </span>
            <StatusBadge tone={severityTone(result.riskLevel)} dot={false}>
              Risk: {result.riskLevel}
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {pass
              ? "No policy violations detected."
              : `Blocked by policy — ${result.violations.length} violation${
                  result.violations.length === 1 ? "" : "s"
                } detected.`}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            Scanned policies: {result.scannedRules}
          </p>
        </div>
      </div>

      {result.violations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.violations.map((v) => (
            <li
              key={v.ruleCode}
              className="rounded-sm border border-border bg-surface-2 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium text-text-primary">
                  {v.ruleCode}
                </span>
                <StatusBadge tone={severityTone(v.severity)} dot={false}>
                  {v.severity}
                </StatusBadge>
                <StatusBadge tone="critical" dot={false}>
                  {v.action}
                </StatusBadge>
              </div>
              <p className="mt-1.5 text-xs text-text-secondary">{v.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
