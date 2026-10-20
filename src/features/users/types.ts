import type { UserStatus } from "@/lib/auth/types";

/** Một dòng trong danh sách tài khoản (UserResponse). Thời điểm là chuỗi ISO. */
export type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: string[];
  lastLoginAt: string | null;
};

/** Chi tiết tài khoản (UserDetailResponse). */
export type UserDetail = UserSummary & {
  employeeId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

/** Role kèm permission và số người đang giữ (RoleResponse). */
export type RoleSummary = {
  code: string;
  name: string;
  description: string | null;
  /** Role hệ thống (ADMIN, HR, MANAGER, EMPLOYEE): không xóa / đổi mã. */
  system: boolean;
  permissionCodes: string[];
  userCount: number;
};

/** Một phiên đăng nhập của user (SessionResponse của GET /api/users/{id}/sessions; `current` luôn false ở đây). */
export type UserSession = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
};

/** Bộ lọc của GET /api/users. Bỏ trống = không lọc. */
export type UserListFilters = {
  keyword?: string;
  status?: UserStatus;
  role?: string;
};

/** Body của POST /api/users. `roleCodes` rỗng → backend gán EMPLOYEE. */
export type CreateUserRequest = {
  email: string;
  displayName: string;
  roleCodes: string[];
};

/** Một quyền (PermissionResponse của GET /api/permissions). Tên / mô tả tiếng Anh từ backend, dùng khi chưa có bản dịch. */
export type PermissionInfo = {
  code: string;
  name: string;
  description: string | null;
};

/** Body của PUT /api/roles/{code}: thay tên, mô tả và TOÀN BỘ quyền. */
export type RoleInput = {
  name: string;
  description: string | null;
  permissionCodes: string[];
};

/** Body của POST /api/roles. Mã viết HOA, không đổi được sau khi tạo. */
export type CreateRoleInput = RoleInput & { code: string };
