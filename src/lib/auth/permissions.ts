import type { Access, CurrentUser } from "./types";

export function hasRole(user: CurrentUser | null, role: string): boolean {
  return !!user && user.roles.includes(role);
}

export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}

/** Kiểm tra điều kiện truy cập (xem kiểu `Access`). Chỉ để ẩn/hiện giao diện: backend vẫn phải tự chặn. */
export function canAccess(user: CurrentUser | null, access?: Access): boolean {
  if (!user) return false;
  const roles = access?.roles ?? [];
  const permissions = access?.permissions ?? [];
  if (roles.length === 0 && permissions.length === 0) return true;
  return roles.some((role) => hasRole(user, role)) || permissions.some((p) => hasPermission(user, p));
}
