import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="text-text-muted">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {description && (
        <div className="max-w-sm text-xs text-text-muted">{description}</div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <AlertTriangle className="h-5 w-5 text-critical" />
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {description && (
        <div className="max-w-sm text-xs text-text-muted">{description}</div>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-skeleton rounded-sm bg-surface-3", className)}
      aria-hidden
    />
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
