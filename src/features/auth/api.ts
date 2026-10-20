import { http } from "@/lib/api/http-client";
import type { AuthResponse } from "@/lib/auth/types";
import type { LoginRequest } from "./types";

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

/** Trình duyệt điều hướng tới đây (không gọi bằng fetch): backend chuyển sang Google rồi về /auth/callback. */
export const GOOGLE_LOGIN_URL = "/oauth2/authorization/google";
