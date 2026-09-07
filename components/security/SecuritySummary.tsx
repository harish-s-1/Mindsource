import { MetricTile } from "@/components/ui/MetricTile";
import type { SecurityPolicy } from "@/lib/types";

// Policy-oriented summary derived from GET /api/security/policies.
// No historical/audit counts — those are a later phase.
export function SecuritySummary({ policies }: { policies: SecurityPolicy[] }) {
  const active = policies.length;
  const blocking = policies.filter((p) => p.action === "BLOCK").length;
  const critical = policies.filter((p) => p.severity === "CRITICAL").length;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4 [&>*]:bg-surface">
      <MetricTile label="Active Policies" value={active} sub="deterministic rules" />
      <MetricTile label="Blocking Policies" value={blocking} sub="action: BLOCK" />
      <MetricTile
        label="Critical Policies"
        value={critical}
        tone={critical > 0 ? "critical" : "neutral"}
        sub="severity: CRITICAL"
      />
      <MetricTile
        label="Policy Engine"
        value="ONLINE"
        tone="healthy"
        sub="rule-based · deterministic"
      />
    </div>
  );
}
