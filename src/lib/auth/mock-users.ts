import type { CurrentUser, RoleCode } from "./types";

// Permission theo role, chép từ seed V4 của backend (V4__seed_roles_and_permissions.sql).
// Khi backend thêm permission mới thì bổ sung ở đây để bản giả lập sát với thực tế.
const ALL_PERMISSIONS = [
  "user:read",
  "user:create",
  "user:update",
  "user:lock",
  "role:read",
  "role:assign",
  "role:manage",
  "session:read-all",
];

const PERMISSIONS_BY_ROLE: Record<RoleCode, string[]> = {
  ADMIN: ALL_PERMISSIONS,
  HR: ["user:read", "user:create", "user:update", "user:lock", "role:read"],
  MANAGER: [],
  EMPLOYEE: [],
};

const NAMES: Record<RoleCode, string> = {
  ADMIN: "Quản trị viên (demo)",
  HR: "Nhân sự (demo)",
  MANAGER: "Quản lý (demo)",
  EMPLOYEE: "Nhân viên (demo)",
};

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: "Quản trị",
  HR: "Nhân sự",
  MANAGER: "Quản lý",
  EMPLOYEE: "Nhân viên",
};

export function createMockUser(role: RoleCode): CurrentUser {
  return {
    id: `00000000-0000-7000-8000-00000000000${["ADMIN", "HR", "MANAGER", "EMPLOYEE"].indexOf(role) + 1}`,
    email: `${role.toLowerCase()}@demo.local`,
    displayName: NAMES[role],
    status: "ACTIVE",
    roles: [role],
    permissions: PERMISSIONS_BY_ROLE[role],
  };
}
