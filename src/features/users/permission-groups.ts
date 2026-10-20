import type { PermissionInfo } from "./types";

/** Thứ tự nhóm quyền trên giao diện. Module mới (vd leave:*, payroll:*) chưa có ở đây thì tự xếp cuối. */
const GROUP_ORDER = ["user", "role", "session", "audit"];

export type PermissionGroup = {
  /** Phần trước dấu ":" của mã quyền, vd "user" trong "user:read". */
  key: string;
  permissions: PermissionInfo[];
};

/** Gom quyền theo phần trước dấu ":" để hiện thành từng nhóm checkbox. */
export function groupPermissions(permissions: PermissionInfo[]): PermissionGroup[] {
  const groups = new Map<string, PermissionInfo[]>();
  for (const permission of permissions) {
    const key = permission.code.split(":")[0];
    groups.set(key, [...(groups.get(key) ?? []), permission]);
  }
  const rank = (key: string) => {
    const index = GROUP_ORDER.indexOf(key);
    return index === -1 ? GROUP_ORDER.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, items]) => ({ key, permissions: items }));
}

/** Key dịch của một quyền trong namespace "Permissions": "session:read-all" → "session_read_all". */
export function permissionMessageKey(code: string): string {
  return code.replace(/[:-]/g, "_");
}
