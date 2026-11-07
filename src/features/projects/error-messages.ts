import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

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
};

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
      // Backend liệt kê mã nhân viên trong message; câu dịch không biết ai nên nối thêm phần sau dấu hai chấm.
      const detail = error.code === "PROJECT_MEMBER_OUTSIDE_DATES" ? error.message.split(": ")[1] : undefined;
      return detail ? `${message} ${detail}` : message;
    }
  }
  return getErrorMessage(error, tErrors);
}
