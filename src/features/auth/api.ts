import { http } from "@/lib/api/http-client";
import type { AuthResponse, LoginRequest } from "./types";

/** Endpoint công khai: không gắn access token (skipAuth). Refresh token được backend đặt vào cookie HttpOnly. */
export const login = (body: LoginRequest) => http.post<AuthResponse>("/api/auth/login", body, { skipAuth: true });

/** Trình duyệt điều hướng tới đây (không gọi bằng fetch): backend chuyển sang Google rồi về /auth/callback. */
export const GOOGLE_LOGIN_URL = "/oauth2/authorization/google";
