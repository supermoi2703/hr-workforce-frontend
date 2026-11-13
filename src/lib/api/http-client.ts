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
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
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

/** Gửi kèm token; gặp TOKEN_EXPIRED thì refresh một lần rồi gửi lại; vẫn 401 thì báo hết phiên. */
async function sendWithAuth(method: string, path: string, options: RequestOptions): Promise<Response> {
  const adapter = getAuthAdapter();
  const useAuth = !options.skipAuth;

  let response = await send(method, path, options, useAuth ? adapter.getAccessToken() : null);
  if (useAuth && response.status === 401) {
    const body = await readJson(response.clone());
    if (isApiResponse(body) && body.code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessTokenOnce();
      if (newToken) response = await send(method, path, options, newToken);
    }
    if (response.status === 401) adapter.onSessionExpired();
  }
  return response;
}

/**
 * Gọi API backend. `path` là đường dẫn tuyệt đối trên cùng origin, vd. `/api/employees`.
 * Trả về `data` của ApiResponse (hoặc nguyên JSON khi `envelope: false`), ném ApiError khi lỗi.
 */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await sendWithAuth(method, path, options);
  const body = await readJson(response);

  if (!response.ok || (isApiResponse(body) && !body.success)) {
    throw toApiError(response.status, body, response.headers);
  }

  if (options.envelope === false) return body as T;
  if (response.status === 204 || body === undefined) return undefined as T;
  if (!isApiResponse(body)) throw toApiError(response.status, body);
  return body.data as T;
}

export type DownloadedFile = { blob: Blob; filename: string | null };

/** Tên file trong header Content-Disposition (`filename*=UTF-8''...` trước, rồi `filename="..."`). */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // rơi xuống dạng thường
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/**
 * Tải file (Excel, PDF...) qua cùng luồng đăng nhập với `http`: tự gắn token, tự refresh. Lỗi trả JSON ApiResponse như
 * mọi API nên vẫn ném ApiError. Lưu file xuống máy bằng `saveFile` (lib/download).
 */
export async function download(path: string, options: Omit<RequestOptions, "body" | "envelope"> = {}): Promise<DownloadedFile> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "*/*");
  const response = await sendWithAuth("GET", path, { ...options, headers });
  if (!response.ok) {
    throw toApiError(response.status, await readJson(response), response.headers);
  }
  const body = await readJson(response.clone());
  if (isApiResponse(body) && !body.success) {
    throw toApiError(response.status, body, response.headers);
  }
  return { blob: await response.blob(), filename: filenameFromDisposition(response.headers.get("content-disposition")) };
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
