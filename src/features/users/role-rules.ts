import type { CurrentUser } from "@/lib/auth/types";
import type { RoleSummary } from "./types";

export const ADMIN_ROLE = "ADMIN";

/**
 * Vì sao không xóa được role (để hiện lời giải thích thay cho nút Xóa):
 * - system: role hệ thống (ADMIN, HR, MANAGER, EMPLOYEE) không bao giờ xóa được;
 * - inUse: role tự tạo nhưng còn người giữ (backend: ROLE_IN_USE).
 */
export type RoleDeleteBlock = "system" | "inUse" | null;

export type RoleRules = {
  /** Role ADMIN: luôn có mọi quyền, không sửa được (backend: SYSTEM_ROLE_PROTECTED). */
  locked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Chỉ có ý nghĩa với người có role:manage (người chỉ xem thì không cần giải thích). */
  deleteBlocked: RoleDeleteBlock;
};

/** Người dùng `actor` được làm gì với `role`, theo đúng luật của backend. Chỉ để ẩn/hiện: backend vẫn kiểm tra lại. */
export function getRoleRules(role: RoleSummary, actor: CurrentUser): RoleRules {
  const canManage = actor.permissions.includes("role:manage");
  const locked = role.code === ADMIN_ROLE;
  const deleteBlocked: RoleDeleteBlock = role.system ? "system" : role.userCount > 0 ? "inUse" : null;
  return {
    locked,
    canEdit: canManage && !locked,
    canDelete: canManage && deleteBlocked === null,
    deleteBlocked: canManage ? deleteBlocked : null,
  };
}

/** Role hệ thống trước (theo thứ tự cố định), role tự tạo sau, theo tên. */
const SYSTEM_ORDER = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

export function sortRoles(roles: RoleSummary[]): RoleSummary[] {
  const rank = (role: RoleSummary) => {
    const index = SYSTEM_ORDER.indexOf(role.code);
    return index === -1 ? SYSTEM_ORDER.length : index;
  };
  return [...roles].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
