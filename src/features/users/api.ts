import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { CreateUserRequest, RoleSummary, UserDetail, UserListFilters, UserSession, UserSummary } from "./types";

/** Tìm kiếm tài khoản (user:read). Sắp xếp được: email, displayName, status, createdAt, lastLoginAt. */
export const searchUsers = (filters: UserListFilters, params: PageParams) =>
  http.get<PageResponse<UserSummary>>("/api/users", {
    query: { ...toPageQuery(params), keyword: filters.keyword, status: filters.status, role: filters.role },
  });

export const getUser = (id: string) => http.get<UserDetail>(`/api/users/${encodeURIComponent(id)}`);

/** Tạo tài khoản PENDING (user:create); backend gửi email kích hoạt sau khi lưu. */
export const createUser = (body: CreateUserRequest) => http.post<UserDetail>("/api/users", body);

/** Sửa tên hiển thị (user:update). */
export const updateUser = (id: string, body: { displayName: string }) =>
  http.patch<UserDetail>(`/api/users/${encodeURIComponent(id)}`, body);

/** Chuyển trạng thái (lock / unlock / disable: user:lock; enable: chỉ ADMIN). Trả chi tiết mới. */
export type UserStatusAction = "lock" | "unlock" | "disable" | "enable";

export const changeUserStatus = (id: string, action: UserStatusAction) =>
  http.post<UserDetail>(`/api/users/${encodeURIComponent(id)}/${action}`);

/** Thay TOÀN BỘ role (role:assign); ít nhất 1 role. */
export const assignRoles = (id: string, roleCodes: string[]) =>
  http.put<UserDetail>(`/api/users/${encodeURIComponent(id)}/roles`, { roleCodes });

/** HR / Admin gửi lại mã kích hoạt cho tài khoản PENDING (user:create); 429 nếu chưa đủ 60 giây. */
export const resendActivation = (id: string) =>
  http.post<void>(`/api/users/${encodeURIComponent(id)}/resend-activation`);

/** Phiên đăng nhập của user (session:read-all). */
export const getUserSessions = (id: string) =>
  http.get<UserSession[]>(`/api/users/${encodeURIComponent(id)}/sessions`);

/** Buộc user đăng xuất khỏi mọi thiết bị (user:lock). */
export const forceLogout = (id: string) => http.post<void>(`/api/users/${encodeURIComponent(id)}/logout-all`);

/** Danh sách role (role:read): cho bộ lọc và ô chọn role. */
export const getRoles = () => http.get<RoleSummary[]>("/api/roles");
