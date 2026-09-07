// Shared HTTP helper for all MINDSource API calls.
// - handles non-2xx responses (surfaces backend detail when present)
// - parses JSON safely
// - supports caller AbortSignal and a default timeout
// - never hides failures: every error becomes a thrown ApiError

import { API_BASE_URL, API_TIMEOUT_MS } from "./config";

export class ApiError extends Error {
  status: number;
  /** True when the request never reached the backend (offline / DNS / CORS). */
  isNetwork: boolean;
  /** Parsed error response body (when the backend returned JSON), for callers
   *  that need structured detail — e.g. the security-gate 403 violations. */
  data: unknown;

  constructor(message: string, status = 0, isNetwork = false, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetwork = isNetwork;
    this.data = data;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  init: RequestInit,
  { signal, timeoutMs = API_TIMEOUT_MS }: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  // Combine the caller's signal with an internal timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    // Distinguish a caller-initiated abort from a genuine network failure.
    if (signal?.aborted) {
      throw new ApiError("Request cancelled", 0, false);
    }
    const aborted = (err as Error)?.name === "AbortError";
    throw new ApiError(
      aborted
        ? "Request to MINDSource API timed out."
        : "Unable to connect to MINDSource API.",
      0,
      true,
    );
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    let body: unknown;
    try {
      body = await res.json();
      const d = (body as { detail?: unknown })?.detail;
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d) && (d[0] as { msg?: string })?.msg) {
        detail = (d[0] as { msg: string }).msg;
      }
    } catch {
      // Non-JSON error body — keep the status line.
    }
    throw new ApiError(detail, res.status, false, body);
  }

  // 204 or empty body.
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("Received an invalid response from MINDSource API.", res.status);
  }
}

export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { method: "GET" }, opts);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) }, opts);
}
