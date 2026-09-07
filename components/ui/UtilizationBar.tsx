import { cn } from "@/lib/cn";
import { utilizationTone } from "./tone";

const BAR_COLOR: Record<string, string> = {
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
  idle: "bg-idle",
  accent: "bg-accent",
};

// Inline utilization meter for dense table cells.
export function UtilizationBar({
  value,
  showLabel = true,
  className,
}: {
  value: number;
  showLabel?: boolean;
  className?: string;
}) {
  const tone = utilizationTone(value);
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full", BAR_COLOR[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="tabular w-9 text-right text-xs text-text-secondary">
          {clamped}%
        </span>
      )}
    </div>
  );
}
