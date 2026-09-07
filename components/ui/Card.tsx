import { cn } from "@/lib/cn";

// Panel — a bordered surface. Borders do elevation; no shadows.
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-surface",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  actions,
  hint,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-text-primary truncate">
          {title}
        </h2>
        {hint}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
