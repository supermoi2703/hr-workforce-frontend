"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createMockUser } from "./mock-users";
import { canAccess, hasPermission, hasRole } from "./permissions";
import { ROLES, type Access, type AuthStatus, type CurrentUser, type RoleCode } from "./types";

export type AuthMode = "mock" | "backend";

export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === "backend" ? "backend" : "mock";

type AuthContextValue = {
  mode: AuthMode;
  status: AuthStatus;
  user: CurrentUser | null;
  /** Chỉ có ở chế độ mock: đổi vai trò giả lập. */
  setMockRole?: (role: RoleCode) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ----- Bản giả lập: vai trò lưu ở localStorage để giữ nguyên khi tải lại trang -----

const MOCK_ROLE_KEY = "hrm.mockRole";
const DEFAULT_MOCK_ROLE: RoleCode = "ADMIN";
const mockListeners = new Set<() => void>();

function subscribeMockRole(listener: () => void) {
  mockListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    mockListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readMockRole(): RoleCode {
  try {
    const stored = window.localStorage.getItem(MOCK_ROLE_KEY);
    return ROLES.includes(stored as RoleCode) ? (stored as RoleCode) : DEFAULT_MOCK_ROLE;
  } catch {
    return DEFAULT_MOCK_ROLE;
  }
}

function writeMockRole(role: RoleCode) {
  try {
    window.localStorage.setItem(MOCK_ROLE_KEY, role);
  } catch {
    // Trình duyệt chặn storage: vẫn đổi trong phiên hiện tại.
  }
  mockListeners.forEach((listener) => listener());
}

function MockAuthProvider({ children }: { children: ReactNode }) {
  // Phía server chưa biết vai trò (undefined) -> "loading"; phía trình duyệt đọc localStorage.
  const role = useSyncExternalStore<RoleCode | undefined>(subscribeMockRole, readMockRole, () => undefined);
  const user = useMemo(() => (role ? createMockUser(role) : null), [role]);
  const value = useMemo<AuthContextValue>(
    () => ({ mode: "mock", status: role ? "authenticated" : "loading", user, setMockRole: writeMockRole }),
    [role, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ----- Đăng nhập thật -----

// TODO(cuongvv): đăng nhập thật qua /api/auth. Gợi ý:
// - Khi khởi động gọi POST /api/auth/refresh (http.post với skipAuth) để lấy access token từ cookie,
//   rồi GET /api/auth/me để lấy CurrentUser; lỗi thì status = "unauthenticated".
// - Đăng ký adapter bằng setAuthAdapter (xem auth-adapter.ts) để HTTP client gắn token và tự refresh.
// - Thêm trang (auth)/login; giữ nguyên kiểu AuthContextValue để các màn hình khác không phải sửa.
function BackendAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({ mode: "backend", status: "unauthenticated", user: null }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return AUTH_MODE === "mock" ? (
    <MockAuthProvider>{children}</MockAuthProvider>
  ) : (
    <BackendAuthProvider>{children}</BackendAuthProvider>
  );
}

function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useCurrentUser phải được dùng bên trong <AuthProvider>");
  return context;
}

/**
 * Cách DUY NHẤT để màn hình lấy người dùng hiện tại và kiểm tra quyền.
 * Không tự đọc token hay gọi /api/auth/me trong feature.
 */
export function useCurrentUser() {
  const { status, user } = useAuthContext();
  const can = useCallback((access?: Access) => canAccess(user, access), [user]);
  return {
    status,
    user,
    can,
    hasRole: (role: string) => hasRole(user, role),
    hasPermission: (permission: string) => hasPermission(user, permission),
  };
}

/** Dùng cho nút đổi vai trò giả lập trên header. */
export function useAuthMode() {
  const { mode, setMockRole } = useAuthContext();
  return { mode, setMockRole };
}
