export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiFieldError[];
}

/** Error thrown for any non-2xx API response. `code` matches the backend error codes. */
export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: ApiFieldError[];

  constructor(status: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T, M> {
  success: boolean;
  data?: T;
  meta?: M;
  error?: ApiErrorBody;
}

// ---------------------------------------------------------------------------
// JWT storage — the access token returned by /auth/login & /auth/register is
// kept in localStorage and sent as `Authorization: Bearer <token>` on every
// API call. It is cleared on logout and on 401 responses.
// ---------------------------------------------------------------------------

const TOKEN_KEY = "app.jwt";

export const authToken = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

function authHeaders(): Record<string, string> {
  const token = authToken.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchEnvelope<T, M>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; meta?: M }> {
  // Merge headers via the Headers API — spreading `init` after a plain-object
  // headers literal would let `init.headers` replace (not merge) the auth and
  // content-type headers.
  const headers = new Headers({
    "Content-Type": "application/json",
    ...authHeaders(),
  });
  new Headers(init.headers ?? {}).forEach((value, key) =>
    headers.set(key, value)
  );

  const res = await fetch(path, { ...init, headers });

  const body = (await res
    .json()
    .catch(() => null)) as ApiEnvelope<T, M> | null;

  if (!res.ok || !body?.success) {
    throw new ApiRequestError(
      res.status,
      body?.error ?? {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong. Please try again.",
      }
    );
  }

  return { data: body.data as T, meta: body.meta };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await fetchEnvelope<T, never>(path, init);
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getWithMeta: <T, M = Record<string, unknown>>(path: string) =>
    fetchEnvelope<T, M>(path),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...init,
    }),
  postFormData: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    const body = (await res.json().catch(() => null)) as ApiEnvelope<T, never> | null;
    if (!res.ok || !body?.success) {
      throw new ApiRequestError(
        res.status,
        body?.error ?? {
          code: "UNKNOWN_ERROR",
          message: "File upload failed. Please try again.",
        }
      );
    }
    return body.data as T;
  },
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
