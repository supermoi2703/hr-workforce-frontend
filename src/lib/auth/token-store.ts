import { isApiError } from "@/lib/api/errors";
import { http } from "@/lib/api/http-client";
import type { AuthResponse } from "./types";

/**
 * Access token CHỈ nằm trong bộ nhớ JS (không localStorage, không cookie): F5 là mất, khi đó lấy lại bằng
 * refreshSession() nhờ cookie refresh_token (HttpOnly, trình duyệt tự gửi tới /api/auth/*).
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Vì sao refresh thất bại:
 * - expired: refresh token sai / hết hạn / bị thu hồi (đăng xuất, admin buộc đăng xuất, đổi mật khẩu...)
 * - ACCOUNT_LOCKED / ACCOUNT_DISABLED: tài khoản vừa bị khóa / vô hiệu hóa
 * - network: không gọi được backend (mất mạng, backend tắt) — phiên có thể vẫn còn
 */
export type RefreshFailureReason = "expired" | "ACCOUNT_LOCKED" | "ACCOUNT_DISABLED" | "network";

export type RefreshResult = { ok: true; response: AuthResponse } | { ok: false; reason: RefreshFailureReason };

/** Chờ trước khi thử lại khi tab khác vừa xoay vòng refresh token (cookie mới cần chút thời gian để có hiệu lực). */
const ROTATED_RETRY_DELAY_MS = 300;

let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Lấy access token mới từ cookie refresh_token. Nhiều lời gọi cùng lúc (StrictMode chạy effect 2 lần,
 * nhiều request cùng gặp TOKEN_EXPIRED) dùng chung MỘT request: gửi 2 request với cùng cookie thì
 * request sau bị backend coi là dùng lại token.
 */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function requestRefresh(): Promise<RefreshResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await http.post<AuthResponse>("/api/auth/refresh", undefined, { skipAuth: true });
      accessToken = response.accessToken;
      return { ok: true, response };
    } catch (error) {
      // Tab khác vừa refresh bằng đúng cookie này (trong 10 giây ân hạn): cookie mới đã về, thử lại đúng 1 lần.
      if (isApiError(error) && error.code === "REFRESH_TOKEN_ROTATED" && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, ROTATED_RETRY_DELAY_MS));
        continue;
      }
      const reason = toFailureReason(error);
      // Lỗi mạng: giữ token cũ (đã hết hạn) để request sau lại gặp TOKEN_EXPIRED và thử refresh tiếp.
      if (reason !== "network") accessToken = null;
      return { ok: false, reason };
    }
  }
}

function toFailureReason(error: unknown): RefreshFailureReason {
  if (!isApiError(error)) return "network";
  if (error.code === "ACCOUNT_LOCKED" || error.code === "ACCOUNT_DISABLED") return error.code;
  // NETWORK_ERROR (status 0, hoặc proxy trả 5xx khi backend tắt) và lỗi 5xx của backend: phiên chưa chắc đã hết.
  if (error.status === 0 || error.status >= 500) return "network";
  return "expired";
}

/** Thu hồi phiên hiện tại ở backend và xóa cookie. Backend luôn trả 200; lỗi mạng cũng bỏ qua (vẫn đăng xuất ở máy). */
export async function logoutRequest(): Promise<void> {
  try {
    await http.post("/api/auth/logout", undefined, { skipAuth: true });
  } catch {
    // Không chặn đăng xuất phía trình duyệt.
  }
}
