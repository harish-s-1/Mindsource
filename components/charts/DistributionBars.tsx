import type { WorkloadDistribution } from "@/lib/types";

// Hand-built horizontal bars — restrained, no chart library needed.
const TYPE_COLOR: Record<string, string> = {
  Training: "bg-accent",
  Inference: "bg-healthy",
  "Fine-tuning": "bg-warning",
  Batch: "bg-idle",
  Experimentation: "bg-border-strong",
};

export function DistributionBars({
  data,
}: {
  data: WorkloadDistribution[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.type} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-text-secondary">
            {d.type}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-surface-3">
            <div
              className={`h-full rounded-sm ${TYPE_COLOR[d.type] ?? "bg-idle"}`}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="tabular w-6 text-right text-xs font-medium text-text-primary">
            {d.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
