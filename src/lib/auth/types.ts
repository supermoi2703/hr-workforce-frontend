/** Mã role hệ thống, khớp RoleCodes của backend. */
export const ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"] as const;
export type RoleCode = (typeof ROLES)[number];

export type UserStatus = "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED";

/** Người dùng hiện tại, khớp MeResponse của GET /api/auth/me. */
export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  /** Có thể chứa role tự tạo ngoài 4 role hệ thống. */
  roles: string[];
  /** Mã permission dạng `resource:action`, vd. `user:read`. */
  permissions: string[];
};

/** Khớp AuthResponse của POST /api/auth/login và /api/auth/refresh. Refresh token không có ở đây (cookie HttpOnly). */
export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  /** Số giây access token còn hiệu lực. */
  expiresIn: number;
  user: CurrentUser;
};

/**
 * Điều kiện truy cập một menu/trang/nút. Thỏa khi người dùng có ÍT NHẤT MỘT role trong `roles`
 * HOẶC ít nhất một permission trong `permissions`. Bỏ trống cả hai = ai đăng nhập cũng thấy.
 */
export type Access = {
  roles?: RoleCode[];
  permissions?: string[];
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
