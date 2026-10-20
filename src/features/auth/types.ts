/** Khớp LoginRequest của backend. */
export type LoginRequest = {
  email: string;
  password: string;
};

/** Một thiết bị đang đăng nhập (SessionResponse của GET /api/auth/sessions). Thời điểm là chuỗi ISO. */
export type SessionInfo = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  /** Lần refresh gần nhất (hoặc lúc đăng nhập). */
  lastActiveAt: string;
  expiresAt: string;
  /** Phiên của chính trình duyệt này (backend so theo cookie refresh_token). */
  current: boolean;
};

/** Các AuditAction người dùng được xem trong "hoạt động của tôi" (selfVisible = true ở backend). */
export const SECURITY_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_LOCKED_OUT",
  "LOGOUT",
  "LOGOUT_ALL",
  "SESSION_REVOKED",
  "SESSIONS_REVOKED_BY_ADMIN",
  "REFRESH_TOKEN_REUSE_DETECTED",
  "ACCOUNT_ACTIVATED",
  "GOOGLE_LINKED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
  "USER_LOCKED",
  "USER_UNLOCKED",
  "USER_DISABLED",
  "USER_ENABLED",
  "USER_ROLES_CHANGED",
] as const;
export type SecurityAction = (typeof SECURITY_ACTIONS)[number];

/** Một dòng hoạt động bảo mật (MyActivityResponse của GET /api/auth/activity). */
export type SecurityActivity = {
  /** Thường là SecurityAction; để string vì backend có thể thêm action mới. */
  action: string;
  outcome: "SUCCESS" | "FAILURE";
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
