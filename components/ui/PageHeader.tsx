import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary max-w-2xl">
            {description}
          </p>
        )}
        {meta && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-text-muted">{label}:</span>
      <span className="text-text-secondary font-medium">{value}</span>
    </span>
  );
}
