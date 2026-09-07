"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="animate-overlay absolute inset-0 h-full w-full cursor-default bg-black/50"
      />
      <div className="animate-drawer relative flex h-full w-full max-w-md flex-col border-l border-border-strong bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-text-primary">{title}</div>
            {subtitle && (
              <div className="mt-0.5 text-xs text-text-secondary">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-t border-border px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
