import { cn } from "@/lib/cn";

// Compact metric — deliberately small and dense, not a marketing stat card.
export function MetricTile({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: React.ReactNode;
  tone?: "healthy" | "warning" | "critical" | "neutral";
}) {
  const valueColor =
    tone === "healthy"
      ? "text-healthy"
      : tone === "warning"
        ? "text-warning"
        : tone === "critical"
          ? "text-critical"
          : "text-text-primary";
  return (
    <div className="px-4 py-3">
      <div className="text-2xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("tabular text-2xl font-semibold leading-none", valueColor)}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-secondary font-medium">{unit}</span>
        )}
      </div>
      {sub && <div className="mt-1.5 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

export function MetricRow({ children }: { children: React.ReactNode }) {
  // gap-px over a border-colored background renders crisp 1px dividers between
  // tiles without the double-border artifacts of divide-* on a grid.
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-6 [&>*]:bg-surface">
      {children}
    </div>
  );
}
