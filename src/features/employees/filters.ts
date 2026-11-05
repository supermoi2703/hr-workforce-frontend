import { EMPLOYEE_STATUSES, type EmployeeFilters, type EmployeeStatus } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEYWORD_LENGTH = 100;

/** Thứ tự tham số trên URL (để link gọn, ổn định). */
const KEYS = ["keyword", "officeId", "departmentId", "teamId", "status"] as const;

function uuid(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && UUID_PATTERN.test(trimmed) ? trimmed : undefined;
}

/**
 * Đọc bộ lọc danh sách hồ sơ từ URL. Giá trị lạ (id không phải UUID, trạng thái không tồn tại) bị bỏ qua thay vì để
 * backend trả 400. Team chỉ có nghĩa khi đã chọn phòng.
 */
export function filtersFromSearchParams(params: { get(name: string): string | null }): EmployeeFilters {
  const status = params.get("status");
  const keyword = params.get("keyword")?.trim().slice(0, MAX_KEYWORD_LENGTH);
  const departmentId = uuid(params.get("departmentId"));
  return {
    keyword: keyword || undefined,
    officeId: uuid(params.get("officeId")),
    departmentId,
    teamId: departmentId ? uuid(params.get("teamId")) : undefined,
    status: (EMPLOYEE_STATUSES as readonly (string | null)[]).includes(status) ? (status as EmployeeStatus) : undefined,
  };
}

/** Ghi bộ lọc ra query string (bỏ giá trị trống). */
export function filtersToSearchParams(filters: EmployeeFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}
