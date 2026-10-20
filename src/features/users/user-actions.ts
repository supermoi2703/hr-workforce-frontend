import type { CurrentUser } from "@/lib/auth/types";
import type { UserSummary } from "./types";

/**
 * Vì sao không cho thao tác trên tài khoản này (để hiện lời giải thích thay vì nút):
 * - self: tài khoản của chính mình (backend: CANNOT_MODIFY_SELF);
 * - adminProtected: tài khoản có role ADMIN mà người thao tác không phải ADMIN (ADMIN_ACCOUNT_PROTECTED).
 */
export type UserActionBlock = "self" | "adminProtected" | null;

export type UserActions = {
  blocked: UserActionBlock;
  lock: boolean;
  unlock: boolean;
  disable: boolean;
  enable: boolean;
  assignRoles: boolean;
  resendActivation: boolean;
  forceLogout: boolean;
  /** Chỉ xem, nên vẫn được khi `blocked`. */
  viewSessions: boolean;
};

/**
 * Thao tác nào được HIỆN cho `actor` trên tài khoản `target`, theo đúng luật của backend
 * (permission + trạng thái + quy tắc bảo vệ). Chỉ để ẩn/hiện: backend vẫn kiểm tra lại.
 */
export function getUserActions(target: UserSummary, actor: CurrentUser): UserActions {
  const can = (permission: string) => actor.permissions.includes(permission);
  const actorIsAdmin = actor.roles.includes("ADMIN");

  const blocked: UserActionBlock =
    target.id === actor.id ? "self" : target.roles.includes("ADMIN") && !actorIsAdmin ? "adminProtected" : null;
  const allowed = blocked === null;
  const { status } = target;

  return {
    blocked,
    lock: allowed && can("user:lock") && status === "ACTIVE",
    unlock: allowed && can("user:lock") && status === "LOCKED",
    disable: allowed && can("user:lock") && status !== "DISABLED",
    enable: allowed && actorIsAdmin && status === "DISABLED",
    assignRoles: allowed && can("role:assign"),
    resendActivation: allowed && can("user:create") && status === "PENDING",
    // Khóa / vô hiệu hóa đã tự thu hồi mọi phiên; PENDING chưa từng đăng nhập.
    forceLogout: allowed && can("user:lock") && status === "ACTIVE",
    viewSessions: can("session:read-all"),
  };
}

/** Các thao tác thay đổi tài khoản (có trong menu); không gồm xem phiên. */
const CHANGE_ACTIONS = ["lock", "unlock", "disable", "enable", "assignRoles", "resendActivation", "forceLogout"] as const;

/** Có ít nhất một thao tác thay đổi tài khoản (để quyết định có hiện menu hay không). */
export function hasAnyUserAction(actions: UserActions): boolean {
  return CHANGE_ACTIONS.some((action) => actions[action]);
}
