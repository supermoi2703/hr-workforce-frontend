import type { EmployeeDetail, EmployeeStatus, OrgUnit, OrgUnits, TeamUnit } from "./types";

// ===== Trạng thái =====

/** Bảng chuyển trạng thái của backend (README employee mục 7). Chuyển khác → 409 INVALID_EMPLOYEE_STATUS_TRANSITION. */
const TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  ONBOARDING: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["ON_LEAVE", "TERMINATED"],
  ON_LEAVE: ["ACTIVE", "TERMINATED"],
  TERMINATED: ["ACTIVE"],
};

export function allowedStatusTransitions(status: EmployeeStatus): EmployeeStatus[] {
  return TRANSITIONS[status] ?? [];
}

/**
 * Nhân viên vào làm lại (hoặc hồ sơ đang làm việc) mà tài khoản vẫn bị khóa / vô hiệu hóa: backend KHÔNG tự mở khóa,
 * nên nhắc HR mở ở trang tài khoản.
 */
export function needsAccountUnlock(detail: Pick<EmployeeDetail, "status" | "account">): boolean {
  return (
    detail.status !== "TERMINATED" &&
    (detail.account?.status === "LOCKED" || detail.account?.status === "DISABLED")
  );
}

// ===== Thao tác được phép =====

export type EmployeeActions = {
  edit: boolean;
  changeStatus: boolean;
  provisionAccount: boolean;
  viewSensitive: boolean;
  /** Link sang /admin/users/{id}. */
  viewAccount: boolean;
  viewAuditLog: boolean;
};

/**
 * Thao tác hiện trên một hồ sơ, theo quyền và trạng thái. Backend vẫn kiểm tra lại (phạm vi dữ liệu, hồ sơ của ADMIN...).
 * Cấp tài khoản: chỉ khi chưa có tài khoản và chưa nghỉ việc (đã nghỉ → 409 EMPLOYEE_TERMINATED).
 */
export function getEmployeeActions(
  detail: Pick<EmployeeDetail, "status" | "account">,
  hasPermission: (permission: string) => boolean,
): EmployeeActions {
  const manage = hasPermission("employee:manage");
  return {
    edit: manage,
    changeStatus: manage,
    provisionAccount: hasPermission("user:create") && detail.account === null && detail.status !== "TERMINATED",
    viewSensitive: hasPermission("employee:sensitive"),
    viewAccount: hasPermission("user:read") && detail.account !== null,
    viewAuditLog: hasPermission("audit:read"),
  };
}

// ===== Thông tin nhạy cảm =====

/** "079203001234" → "•••• 1234". Chuỗi ngắn hơn 6 ký tự che hết. null / rỗng → null. */
export function maskSensitive(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length < 6 ? "••••" : `•••• ${value.slice(-4)}`;
}

// ===== Danh mục tổ chức =====

export type OrgLookup = {
  office: (id: string | null | undefined) => OrgUnit | undefined;
  department: (id: string | null | undefined) => OrgUnit | undefined;
  team: (id: string | null | undefined) => TeamUnit | undefined;
  position: (id: string | null | undefined) => OrgUnit | undefined;
};

function index<T extends OrgUnit>(units: readonly T[] | undefined) {
  const map = new Map((units ?? []).map((unit) => [unit.id, unit]));
  return (id: string | null | undefined) => (id ? map.get(id) : undefined);
}

/** id → đơn vị (kể cả đã ngừng dùng). Chưa tải xong thì mọi tra cứu trả undefined. */
export function buildOrgLookup(units: Partial<OrgUnits>): OrgLookup {
  return {
    office: index(units.offices),
    department: index(units.departments),
    team: index(units.teams),
    position: index(units.positions),
  };
}

/**
 * Lựa chọn cho ô chọn đơn vị: các đơn vị đang dùng, cộng đơn vị hồ sơ đang trỏ tới nếu nó đã ngừng dùng (để form sửa
 * không bị trống ô; backend sẽ từ chối nếu giữ nguyên, HR phải chọn đơn vị khác).
 */
export function orgUnitOptions<T extends OrgUnit>(units: readonly T[] | undefined, currentId?: string | null): T[] {
  return (units ?? []).filter((unit) => unit.active || unit.id === currentId);
}

/** Team của một phòng (cho ô team phụ thuộc ô phòng). */
export function teamsOf(teams: readonly TeamUnit[] | undefined, departmentId: string | null | undefined): TeamUnit[] {
  return departmentId ? (teams ?? []).filter((team) => team.departmentId === departmentId) : [];
}
