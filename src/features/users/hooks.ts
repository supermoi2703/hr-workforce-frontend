"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { ROLES, type RoleCode } from "@/lib/auth/types";
import {
  assignRoles,
  changeUserStatus,
  createRole,
  createUser,
  deleteRole,
  forceLogout,
  getPermissions,
  getRole,
  getRoles,
  getUser,
  getUserSessions,
  resendActivation,
  searchUsers,
  updateRole,
  updateUser,
  type UserStatusAction,
} from "./api";
import type { RoleInput, UserListFilters } from "./types";

/** Query key của domain tài khoản. Mọi key bắt đầu bằng "users" để invalidate cả nhóm sau khi sửa. */
export const userKeys = {
  all: ["users"] as const,
  list: (filters: UserListFilters, params: PageParams) => ["users", "list", filters, params] as const,
  detail: (id: string) => ["users", "detail", id] as const,
  sessions: (id: string) => ["users", "sessions", id] as const,
  roles: ["users", "roles"] as const,
  role: (code: string) => ["users", "roles", code] as const,
  permissions: ["users", "permissions"] as const,
};

// ----- Vai trò & quyền -----

export function useRole(code: string) {
  return useQuery({ queryKey: userKeys.role(code), queryFn: () => getRole(code) });
}

/** Danh sách quyền: chỉ đổi khi backend thêm migration, nên giữ lâu. */
export function usePermissions() {
  return useQuery({ queryKey: userKeys.permissions, queryFn: getPermissions, staleTime: 30 * 60_000 });
}

// Sửa / tạo / xóa role: invalidate cả nhóm "users" vì nhãn role và số người giữ hiện ở cả bảng tài khoản.

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateRole(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RoleInput) => updateRole(code, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

/** Khóa / mở khóa / vô hiệu hóa / kích hoạt lại; xong thì tải lại danh sách, chi tiết, phiên (khóa thu hồi phiên). */
export function useUserStatusAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: UserStatusAction }) => changeUserStatus(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useAssignRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleCodes }: { id: string; roleCodes: string[] }) => assignRoles(id, roleCodes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResendActivation() {
  return useMutation({ mutationFn: resendActivation });
}

export function useForceLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forceLogout,
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: userKeys.sessions(id) }),
  });
}

/** Phiên đăng nhập của user; chỉ gọi khi được phép xem (session:read-all). */
export function useUserSessions(id: string, enabled: boolean) {
  return useQuery({ queryKey: userKeys.sessions(id), queryFn: () => getUserSessions(id), enabled });
}

export function useUsers(filters: UserListFilters, params: PageParams) {
  return useQuery({
    queryKey: userKeys.list(filters, params),
    queryFn: () => searchUsers(filters, params),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => getUser(id) });
}

/** Danh sách role; chỉ gọi khi người dùng có role:read (không có thì backend trả 403). */
export function useRoles() {
  const { hasPermission } = useCurrentUser();
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: getRoles,
    enabled: hasPermission("role:read"),
    staleTime: 5 * 60_000, // role ít khi đổi
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { displayName: string }) => updateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

/**
 * Tên hiển thị của role: 4 role hệ thống dùng bản dịch (Roles.*), role tự tạo dùng `name` từ /api/roles,
 * chưa tải được thì hiện mã.
 */
export function useRoleLabel() {
  const tRole = useTranslations("Roles");
  const roles = useRoles().data;
  return useCallback(
    (code: string) =>
      ROLES.includes(code as RoleCode)
        ? tRole(code as RoleCode)
        : (roles?.find((role) => role.code === code)?.name ?? code),
    [tRole, roles],
  );
}
