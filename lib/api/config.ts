// API base URL — configurable via NEXT_PUBLIC_API_BASE_URL.
// Defaults to the local FastAPI dev server. The trailing slash is stripped so
// callers can always join paths as `${API_BASE_URL}/api/...`.
const raw =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000";

export const API_BASE_URL = raw.replace(/\/+$/, "");

// Default per-request timeout (ms) for API calls.
export const API_TIMEOUT_MS = 8000;
