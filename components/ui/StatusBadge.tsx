import { cn } from "@/lib/cn";

export type BadgeTone = "healthy" | "warning" | "critical" | "idle" | "accent";

const TONE_CLASSES: Record<BadgeTone, string> = {
  healthy: "text-healthy bg-healthy-bg border-healthy/25",
  warning: "text-warning bg-warning-bg border-warning/25",
  critical: "text-critical bg-critical-bg border-critical/25",
  idle: "text-text-secondary bg-idle-bg border-border-strong",
  accent: "text-accent bg-accent-muted border-accent/25",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
  idle: "bg-idle",
  accent: "bg-accent",
};

export function StatusBadge({
  children,
  tone = "idle",
  dot = true,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
