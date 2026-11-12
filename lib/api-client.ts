/**
 * Single HTTP boundary for the frontend. Requests go to /api/* (rewritten to Express by Next),
 * carry the httpOnly auth cookies, and transparently refresh the session once on a 401.
 */

export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Skip the automatic refresh-and-retry (used by the auth endpoints themselves). */
  noRefresh?: boolean;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time: concurrent 401s wait for the same refresh call. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ""}`;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const err = body?.error;
  return new ApiError(
    res.status,
    err?.code ?? "INTERNAL",
    err?.message ?? (res.status >= 500 ? "Something went wrong. Please try again." : "Request failed"),
    err?.details?.fieldErrors ?? {},
  );
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const send = () =>
    fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      credentials: "include",
      // FormData (file uploads) sets its own multipart Content-Type with the boundary.
      headers: opts.body !== undefined && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      body: opts.body instanceof FormData ? opts.body : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && !opts.noRefresh && (await refreshSession())) res = await send();
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
