import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

// Small, unobtrusive marker asserting a surface is simulated / demo data.
// Used liberally — every screen showing synthetic data carries one.
export function SimulationBadge({
  label = "SIMULATION",
  className,
}: {
  label?:
    | "SIMULATION"
    | "WHAT-IF SIMULATION"
    | "DEMO"
    | "DEMO DECISION"
    | "SIMULATED RECOMMENDATION";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border-strong bg-surface-2 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-text-secondary",
        className,
      )}
      title="This data is simulated. No live telemetry, scheduler, or model is connected."
    >
      <FlaskConical className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
