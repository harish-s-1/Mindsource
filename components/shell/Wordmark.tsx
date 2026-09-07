import { cn } from "@/lib/cn";

// Typographic lockup — no logo mark. "MIND" primary, "Source" secondary.
export function Wordmark({
  showSubtitle = true,
  className,
}: {
  showSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("select-none leading-none", className)}>
      <div className="flex items-baseline gap-px">
        <span className="text-md font-semibold tracking-tight text-text-primary">
          MIND
        </span>
        <span className="text-md font-semibold tracking-tight text-accent">
          Source
        </span>
      </div>
      {showSubtitle && (
        <div className="mt-1 text-2xs font-medium uppercase tracking-wide text-text-muted">
          AI Cloud Resource Intelligence
        </div>
      )}
    </div>
  );
}
