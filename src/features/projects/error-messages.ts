import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

type ProjectErrorKey = keyof Messages["Projects"]["Errors"];
/** Hàm dịch của namespace "Projects.Errors". */
export type ProjectErrorsTranslator = (key: ProjectErrorKey) => string;

// Mã lỗi riêng của module dự án (backend ErrorCode, README modules/project mục 3).
const ERROR_KEYS: Record<string, ProjectErrorKey> = {
  PROJECT_NOT_FOUND: "notFound",
  PROJECT_CODE_EXISTS: "codeExists",
  PROJECT_CLOSED: "closed",
  PROJECT_CREATE_FORBIDDEN: "createForbidden",
  PROJECT_ACTION_FORBIDDEN: "actionForbidden",
  PROJECT_DEPARTMENT_INVALID: "departmentInvalid",
  PROJECT_OFFICE_INVALID: "officeInvalid",
  PROJECT_DATE_RANGE_INVALID: "dateRangeInvalid",
  PROJECT_ALLOCATION_PERCENT_INVALID: "percentInvalid",
  PROJECT_EMPLOYEE_INVALID: "employeeInvalid",
  PROJECT_EMPLOYEE_NOT_ACTIVE: "employeeNotActive",
  PROJECT_EMPLOYEE_ALREADY_IN_PROJECT: "alreadyInProject",
  PROJECT_OBSERVER_NOT_FOUND: "observerNotFound",
  PROJECT_MEMBER_OUTSIDE_DATES: "memberOutsideDates",
  STALE_VERSION: "staleVersion",
  // Phân bổ có duyệt (3.4), README module project mục 8.4
  ALLOCATION_OVER_LIMIT: "allocationOverLimit",
  ALLOCATION_DATES_INVALID: "allocationDatesInvalid",
  ALLOCATION_REQUEST_PENDING: "allocationRequestPending",
  ALLOCATION_EMPLOYEE_IS_PM: "allocationEmployeeIsPm",
  ALLOCATION_NO_LONGER_VALID: "allocationNoLongerValid",
  ALLOCATION_MEMBER_NOT_FOUND: "allocationMemberNotFound",
};

// "Employee NV001 would be allocated 110% from 2026-12-01" → mã nhân viên, tổng %, ngày bắt đầu vượt.
const OVER_LIMIT_DETAIL = /^Employee (\S+) would be allocated (\d+)% from (\d{4}-\d{2}-\d{2})$/;

/** Phần chi tiết backend ghi trong message mà câu dịch không biết: ai, bao nhiêu, từ ngày nào. */
function errorDetail(code: string, message: string): string | undefined {
  if (code === "PROJECT_MEMBER_OUTSIDE_DATES") return message.split(": ")[1];
  if (code === "ALLOCATION_OVER_LIMIT") {
    const match = OVER_LIMIT_DETAIL.exec(message);
    if (match) return `${match[1]}: ${match[2]}% (${formatDate(match[3])})`;
  }
  return undefined;
}

export function isProjectErrorCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}

/** Dữ liệu trên màn hình đã cũ: tải lại để người dùng thấy bản mới. */
export function isStaleProjectError(error: unknown): boolean {
  return ["STALE_VERSION", "PROJECT_CLOSED", "PROJECT_OBSERVER_NOT_FOUND"].some((code) => isProjectErrorCode(error, code));
}

export function getProjectError(error: unknown, t: ProjectErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) {
      const message = t(key);
      // Backend nêu người, mức %, ngày trong message; câu dịch không biết nên nối thêm phần chi tiết.
      const detail = errorDetail(error.code, error.message);
      return detail ? `${message} ${detail}` : message;
    }
  }
  return getErrorMessage(error, tErrors);
}
