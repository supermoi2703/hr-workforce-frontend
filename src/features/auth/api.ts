import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { AuthResponse } from "@/lib/auth/types";
import type { LoginRequest, SecurityActivity, SessionInfo } from "./types";

/** Endpoint công khai: không gắn access token (skipAuth). Refresh token được backend đặt vào cookie HttpOnly. */
export const login = (body: LoginRequest) => http.post<AuthResponse>("/api/auth/login", body, { skipAuth: true });

// Quên mật khẩu / kích hoạt: công khai (skipAuth). "forgot" và "resend" luôn trả 200 dù email có tồn tại hay không.

export const forgotPassword = (email: string) =>
  http.post<void>("/api/auth/password/forgot", { email }, { skipAuth: true });

export const resetPassword = (body: { email: string; otp: string; newPassword: string }) =>
  http.post<void>("/api/auth/password/reset", body, { skipAuth: true });

export const activateAccount = (body: { email: string; otp: string; password: string }) =>
  http.post<void>("/api/auth/activation", body, { skipAuth: true });

export const resendActivation = (email: string) =>
  http.post<void>("/api/auth/activation/resend", { email }, { skipAuth: true });

// Tài khoản của chính người đang đăng nhập (cần access token). Đường dẫn /api/auth/* nên trình duyệt gửi kèm
// cookie refresh_token: backend dựa vào đó để biết phiên hiện tại (đánh dấu "máy này", giữ lại khi đổi mật khẩu).

export const getMySessions = () => http.get<SessionInfo[]>("/api/auth/sessions");

export const revokeSession = (id: string) => http.delete<void>(`/api/auth/sessions/${encodeURIComponent(id)}`);

/** Giữ phiên hiện tại, đăng xuất các thiết bị khác. */
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  http.post<void>("/api/auth/password/change", body);

/** Hoạt động bảo mật của chính mình, mới nhất trước. */
export const getMyActivity = (params: PageParams) =>
  http.get<PageResponse<SecurityActivity>>("/api/auth/activity", { query: toPageQuery(params) });

/** Trình duyệt điều hướng tới đây (không gọi bằng fetch): backend chuyển sang Google rồi về /auth/callback. */
export const GOOGLE_LOGIN_URL = "/oauth2/authorization/google";
