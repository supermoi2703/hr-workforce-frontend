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

/**
 * Phạm vi dữ liệu của role (DataScope backend), xếp từ hẹp đến rộng. Chỉ áp dụng cho các quyền role đó có;
 * người nhiều role dùng phạm vi rộng nhất.
 */
export const DATA_SCOPES = ["SELF", "TEAM", "OFFICE", "ALL"] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

/** Role kèm permission và số người đang giữ (RoleResponse). */
export type RoleSummary = {
  code: string;
  name: string;
  description: string | null;
  /** Role hệ thống (ADMIN, HR, MANAGER, EMPLOYEE): không xóa / đổi mã. */
  system: boolean;
  dataScope: DataScope;
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

/**
 * Body của PUT /api/roles/{code}: thay tên, mô tả, phạm vi dữ liệu và TOÀN BỘ quyền.
 * `dataScope` luôn gửi (backend coi null là giữ nguyên, dễ quên mà không báo lỗi).
 */
export type RoleInput = {
  name: string;
  description: string | null;
  dataScope: DataScope;
  permissionCodes: string[];
};

/** Body của POST /api/roles. Mã viết HOA, không đổi được sau khi tạo. */
export type CreateRoleInput = RoleInput & { code: string };
