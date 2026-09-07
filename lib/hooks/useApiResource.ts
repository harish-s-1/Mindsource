"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export interface ApiResource<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

interface Options {
  // When set, silently re-fetch on this interval (ms) without toggling the
  // loading state — used for live telemetry pages. On a failed background
  // refresh the last good data is kept and `error` is set.
  refreshMs?: number;
}

/**
 * Runs an API fetcher on mount and exposes {data, error, loading, reload}.
 * The fetcher receives an AbortSignal and must be stable (wrap in useCallback).
 * Backend failures are surfaced as ApiError — never swallowed or faked.
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: Options = {},
): ApiResource<T> {
  const { refreshMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Primary load: shows the loading state. Re-runs on mount, fetcher change
  // (e.g. a new route param) and manual reload().
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((res) => {
        if (!active) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(
          err instanceof ApiError ? err : new ApiError(String(err), 0, true),
        );
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetcher, nonce]);

  // Optional silent background refresh (no loading flash, keeps last good data).
  useEffect(() => {
    if (!refreshMs) return;
    let active = true;
    const id = setInterval(() => {
      const controller = new AbortController();
      fetcher(controller.signal)
        .then((res) => {
          if (active) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!active || controller.signal.aborted) return;
          setError(
            err instanceof ApiError ? err : new ApiError(String(err), 0, true),
          );
        });
    }, refreshMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fetcher, refreshMs]);

  return { data, error, loading, reload };
}
