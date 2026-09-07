"use client";

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { ApiError, API_BASE_URL } from "@/lib/api";
import { Button } from "./Button";
import { Skeleton } from "./States";

// Honest error surface for a failed API call. Distinguishes "backend offline"
// (network) from an API error response — and never renders placeholder data.
export function ApiErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: ApiError;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const offline = error.isNetwork;
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${
        compact ? "py-8" : "py-14"
      }`}
      role="alert"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-md border ${
          offline
            ? "border-warning/30 bg-warning-bg text-warning"
            : "border-critical/30 bg-critical-bg text-critical"
        }`}
      >
        {offline ? (
          <WifiOff className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-text-primary">
          {offline ? "Backend offline" : "Request failed"}
        </div>
        <p className="mt-1 max-w-sm text-xs text-text-secondary">
          {offline
            ? "Unable to connect to MINDSource API."
            : error.message}
        </p>
        <p className="mt-1 font-mono text-2xs text-text-muted">{API_BASE_URL}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Generic skeleton loading block for API-backed panels.
export function ApiLoadingState({
  rows = 6,
  label = "Loading",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

// A row of metric-tile skeletons for the overview header.
export function ApiMetricSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-6 [&>*]:bg-surface">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="space-y-2 px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}
