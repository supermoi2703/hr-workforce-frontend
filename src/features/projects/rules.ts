import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectCreateScope,
  type ProjectFilters,
  type ProjectMember,
  type ProjectStatus,
  type ProjectType,
  type UnitRef,
} from "./types";

/** Khớp ProjectConstants.CODE_REGEX của backend; backend lưu dạng viết HOA. */
export const PROJECT_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{1,9}$/;
export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
const MIN_PERCENT = 5;
const MAX_PERCENT = 100;
const PERCENT_STEP = 5;
/** Còn từng này ngày trở xuống thì báo sắp hết hạn. */
export const ENDING_SOON_DAYS = 14;

/** Bội số của 5, từ 5 đến 100 (ProjectConstants.isValidAllocationPercent). */
export function isValidPercent(value: string): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  const percent = Number(value);
  return percent >= MIN_PERCENT && percent <= MAX_PERCENT && percent % PERCENT_STEP === 0;
}

// ===== Bộ lọc trên URL

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEYWORD_LENGTH = 100;

function uuid(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && UUID_PATTERN.test(trimmed) ? trimmed : undefined;
}

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

/** Đọc bộ lọc từ URL. Giá trị lạ bị bỏ qua thay vì để backend trả 400. */
export function filtersFromSearchParams(params: { get(name: string): string | null }): ProjectFilters {
  return {
    q: params.get("q")?.trim().slice(0, MAX_KEYWORD_LENGTH) || undefined,
    status: oneOf<ProjectStatus>(PROJECT_STATUSES, params.get("status")),
    type: oneOf<ProjectType>(PROJECT_TYPES, params.get("type")),
    departmentId: uuid(params.get("departmentId")),
    officeId: uuid(params.get("officeId")),
    mine: params.get("mine") === "1" || undefined,
  };
}

/** Ghi bộ lọc ra query string, bỏ giá trị trống. */
export function filtersToSearchParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.mine) params.set("mine", "1");
  for (const key of ["q", "status", "type", "departmentId", "officeId"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

// ===== Tiến độ theo ngày

export type DeadlineState = "notStarted" | "endingSoon" | "overdue";

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

/** null = không có gì cần lưu ý. Dự án đã đóng không có cảnh báo; quá hạn vẫn là ACTIVE tới khi được đóng. */
export function deadlineState(
  project: { status: ProjectStatus; startDate: string; endDate: string | null },
  today: string,
): DeadlineState | null {
  if (project.status === "CLOSED") return null;
  if (project.startDate > today) return "notStarted";
  if (!project.endDate) return null;
  const left = daysBetween(today, project.endDate);
  if (left < 0) return "overdue";
  return left <= ENDING_SOON_DAYS ? "endingSoon" : null;
}

// ===== Quyền và lựa chọn

export function canCreateProject(scope: ProjectCreateScope | undefined): boolean {
  return !!scope && (scope.allDepartments || scope.departmentIds.length > 0);
}

/** Các phòng được chọn khi tạo dự án: mọi phòng, hoặc phòng mình đứng đầu. */
export function creatableDepartments(scope: ProjectCreateScope | undefined, departments: UnitRef[]): UnitRef[] {
  if (!scope) return [];
  return scope.allDepartments ? departments : departments.filter((unit) => scope.departmentIds.includes(unit.id));
}

/** Người đang có phân bổ: phải kết thúc phân bổ trước khi làm PM. Người quan sát được, backend kết thúc dòng quan sát. */
export function allocatedEmployeeIds(members: ProjectMember[]): string[] {
  return members.filter((member) => member.role === "MEMBER").map((member) => member.employee.id);
}

/** PM đang giữ: dòng chưa kết thúc. */
export function currentManager(members: ProjectMember[]): ProjectMember | undefined {
  return members.find((member) => member.role === "PM" && member.toDate === null);
}

/** Có dòng nào người xem không được xem % không (không tính người quan sát, vốn không có %). */
export function hasHiddenPercent(members: ProjectMember[]): boolean {
  return members.some((member) => member.role !== "OBSERVER" && member.allocationPercent === null);
}
