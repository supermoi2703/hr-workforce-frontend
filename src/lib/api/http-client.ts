import { getAuthAdapter } from "@/lib/auth/auth-adapter";
import { ApiError, CLIENT_ERROR_CODES } from "./errors";
import type { ApiResponse, PageParams } from "./types";

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export type RequestOptions = {
  query?: QueryParams;
  /** Object sẽ được gửi dạng JSON; FormData được gửi nguyên (upload file, ảnh khuôn mặt...). */
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /**
   * true (mặc định): phản hồi là ApiResponse<T>, client trả về `data`.
   * false: trả nguyên JSON (vd. /actuator/health không bọc ApiResponse).
   */
  envelope?: boolean;
  /** Không gắn token và không tự refresh (vd. các endpoint đăng nhập/refresh). */
  skipAuth?: boolean;
};

// Nhiều request cùng gặp TOKEN_EXPIRED chỉ refresh một lần rồi dùng chung kết quả.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = getAuthAdapter()
      .refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export function buildUrl(path: string, query?: QueryParams): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null || item === "") continue;
      params.append(key, String(item));
    }
  }
  const search = params.toString();
  if (!search) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${search}`;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || !contentType.includes("json")) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === "object" && value !== null && "success" in value && "code" in value;
}

/** Header `Retry-After` dạng số giây (backend không dùng dạng ngày giờ). */
function readRetryAfter(headers?: Headers): number | undefined {
  const value = headers?.get("Retry-After");
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function toApiError(status: number, body: unknown, headers?: Headers): ApiError {
  if (isApiResponse(body)) {
    return new ApiError({
      status,
      code: body.code,
      message: body.message,
      fieldErrors: body.errors,
      retryAfterSeconds: readRetryAfter(headers),
    });
  }
  // Không phải ApiResponse: thường là backend chưa chạy (proxy trả 500) hoặc lỗi hạ tầng.
  const code = status >= 500 || status === 0 ? CLIENT_ERROR_CODES.NETWORK_ERROR : CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE;
  return new ApiError({ status, code, message: `HTTP ${status}` });
}

async function send(method: string, path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body; // trình duyệt tự đặt Content-Type multipart kèm boundary
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      signal: options.signal,
      credentials: "same-origin",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, code: CLIENT_ERROR_CODES.NETWORK_ERROR, message: "Network error" });
  }
}

/**
 * Gọi API backend. `path` là đường dẫn tuyệt đối trên cùng origin, vd. `/api/employees`.
 * Trả về `data` của ApiResponse (hoặc nguyên JSON khi `envelope: false`), ném ApiError khi lỗi.
 */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const adapter = getAuthAdapter();
  const useAuth = !options.skipAuth;

  let response = await send(method, path, options, useAuth ? adapter.getAccessToken() : null);
  let body = await readJson(response);

  if (useAuth && response.status === 401) {
    const code = isApiResponse(body) ? body.code : undefined;
    if (code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessTokenOnce();
      if (newToken) {
        response = await send(method, path, options, newToken);
        body = await readJson(response);
      }
    }
    if (response.status === 401) adapter.onSessionExpired();
  }

  if (!response.ok || (isApiResponse(body) && !body.success)) {
    throw toApiError(response.status, body, response.headers);
  }

  if (options.envelope === false) return body as T;
  if (response.status === 204 || body === undefined) return undefined as T;
  if (!isApiResponse(body)) throw toApiError(response.status, body);
  return body.data as T;
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

/** Chuyển trạng thái bảng (trang từ 0, sắp xếp) sang query param kiểu Spring Data. */
export function toPageQuery(params: PageParams): QueryParams {
  return { page: params.page, size: params.size, sort: params.sort };
}
