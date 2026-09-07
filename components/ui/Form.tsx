import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-text-secondary"
      >
        {label}
      </label>
      {children}
      {hint && <span className="text-2xs text-text-muted">{hint}</span>}
    </div>
  );
}

const controlBase =
  "h-8 w-full rounded-sm border border-border-strong bg-surface-2 px-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(controlBase, className)} {...props} />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(controlBase, "appearance-none pr-8 cursor-pointer", className)}
    {...props}
  >
    {children}
  </select>
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      controlBase,
      "h-auto min-h-[64px] py-2 leading-5",
      className,
    )}
    {...props}
  />
);
