import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // Accent reserved for primary actions only.
  primary:
    "bg-accent text-bg font-medium hover:bg-accent-hover border border-accent",
  secondary:
    "bg-surface-2 text-text-primary border border-border-strong hover:border-accent/50 hover:text-white",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-surface-2 hover:text-text-primary",
  danger:
    "bg-transparent text-critical border border-critical/40 hover:bg-critical-bg",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-sm gap-2",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
