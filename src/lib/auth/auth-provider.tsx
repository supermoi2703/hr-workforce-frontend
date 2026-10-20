"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthAdapter } from "./auth-adapter";
import { createMockUser } from "./mock-users";
import { canAccess, hasPermission, hasRole } from "./permissions";
import { subscribeSession, broadcastSession } from "./session-channel";
import { getAccessToken, logoutRequest, refreshSession, setAccessToken, type RefreshFailureReason } from "./token-store";
import { ROLES, type Access, type AuthResponse, type AuthStatus, type CurrentUser, type RoleCode } from "./types";

export type AuthMode = "mock" | "backend";

export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === "backend" ? "backend" : "mock";

/** Vì sao phiên vừa kết thúc: tự đăng xuất, hoặc lý do refresh thất bại (xem RefreshFailureReason). */
export type SessionEndReason = "signed-out" | Exclude<RefreshFailureReason, "network">;

type AuthContextValue = {
  mode: AuthMode;
  status: AuthStatus;
  user: CurrentUser | null;
  /** Chỉ có ở chế độ mock: đổi vai trò giả lập. */
  setMockRole?: (role: RoleCode) => void;
  /** Chỉ có ở chế độ backend: bắt đầu phiên bằng kết quả của POST /api/auth/login. */
  signIn?: (response: AuthResponse) => void;
  /** Chỉ có ở chế độ backend: đăng xuất phiên hiện tại. */
  signOut?: () => Promise<void>;
  /** Lý do phiên vừa kết thúc (null khi chưa từng đăng nhập trong lần mở trang này). */
  endReason?: SessionEndReason | null;
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

// ----- Đăng nhập thật qua /api/auth -----

type SessionState = { status: AuthStatus; user: CurrentUser | null; endReason: SessionEndReason | null };

/**
 * - Mở trang / F5: POST /api/auth/refresh (cookie HttpOnly) để lấy lại access token; không có phiên thì "unauthenticated".
 * - Gắn adapter cho HTTP client: tự refresh khi gặp TOKEN_EXPIRED, hết hẳn phiên thì kết thúc kèm lý do.
 * - Đồng bộ đăng nhập / đăng xuất giữa các tab (session-channel).
 */
function BackendAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>({ status: "loading", user: null, endReason: null });

  // Đọc trong callback của adapter / kênh tab (không phụ thuộc lần render). Cập nhật ngay khi đổi phiên
  // (startSession / endSession) và đồng bộ lại sau mỗi lần render.
  const statusRef = useRef<AuthStatus>("loading");
  const lastRefreshFailure = useRef<RefreshFailureReason | null>(null);
  useEffect(() => {
    statusRef.current = session.status;
  }, [session.status]);

  const startSession = useCallback((response: AuthResponse) => {
    setAccessToken(response.accessToken);
    lastRefreshFailure.current = null;
    statusRef.current = "authenticated";
    setSession({ status: "authenticated", user: response.user, endReason: null });
  }, []);

  const endSession = useCallback(
    (reason: SessionEndReason, notifyOtherTabs: boolean) => {
      setAccessToken(null);
      statusRef.current = "unauthenticated";
      // Xóa dữ liệu đã tải để người đăng nhập sau (máy dùng chung) không thấy dữ liệu của người trước.
      queryClient.clear();
      setSession({ status: "unauthenticated", user: null, endReason: reason });
      if (notifyOtherTabs) broadcastSession({ type: "signed-out" });
    },
    [queryClient],
  );

  // Mở trang: lấy lại phiên từ cookie. StrictMode gọi 2 lần nhưng refreshSession dùng chung một request.
  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((result) => {
      if (cancelled) return;
      if (result.ok) startSession(result.response);
      else setSession((current) => (current.status === "loading" ? { ...current, status: "unauthenticated" } : current));
    });
    return () => {
      cancelled = true;
    };
  }, [startSession]);

  useEffect(() => {
    setAuthAdapter({
      getAccessToken,
      refreshAccessToken: async () => {
        const result = await refreshSession();
        if (!result.ok) {
          lastRefreshFailure.current = result.reason;
          return null;
        }
        lastRefreshFailure.current = null;
        // Role / permission có thể vừa đổi ở backend: cập nhật luôn để menu, nút theo quyền mới.
        setSession((current) => ({ ...current, user: result.response.user }));
        return result.response.accessToken;
      },
      onSessionExpired: () => {
        const reason = lastRefreshFailure.current;
        lastRefreshFailure.current = null;
        if (statusRef.current !== "authenticated") return;
        // Mất mạng lúc refresh: chưa chắc phiên đã hết, request đó tự báo lỗi mạng; lần sau sẽ thử refresh lại.
        if (reason === "network") return;
        endSession(reason ?? "expired", true);
      },
    });
    return () => setAuthAdapter(null);
  }, [endSession]);

  // Tab khác đăng xuất → tab này cũng thoát. Tab khác đăng nhập → tab này lấy phiên từ cookie dùng chung.
  useEffect(
    () =>
      subscribeSession((message) => {
        if (message.type === "signed-out") {
          if (statusRef.current === "authenticated") endSession("signed-out", false);
        } else if (statusRef.current !== "authenticated") {
          void refreshSession().then((result) => result.ok && startSession(result.response));
        }
      }),
    [endSession, startSession],
  );

  const signIn = useCallback(
    (response: AuthResponse) => {
      startSession(response);
      broadcastSession({ type: "signed-in" });
    },
    [startSession],
  );

  const signOut = useCallback(async () => {
    await logoutRequest();
    endSession("signed-out", true);
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode: "backend", ...session, signIn, signOut }),
    [session, signIn, signOut],
  );
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

const noop = () => {};
const noopAsync = async () => {};

/**
 * Bắt đầu / kết thúc phiên (trang đăng nhập, nút Đăng xuất). Ở chế độ mock không làm gì.
 * `endReason`: vì sao phiên vừa kết thúc, để trang đăng nhập giải thích cho người dùng.
 */
export function useAuthActions() {
  const { signIn, signOut, endReason } = useAuthContext();
  return { signIn: signIn ?? noop, signOut: signOut ?? noopAsync, endReason: endReason ?? null };
}
