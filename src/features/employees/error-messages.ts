import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type EmployeesErrorKey = keyof Messages["Employees"]["Errors"];
/** Hàm dịch của namespace "Employees.Errors". */
export type EmployeesErrorsTranslator = (key: EmployeesErrorKey) => string;

// Mã lỗi của module employee (README backend employee mục 7) và lỗi module user gặp khi cấp tài khoản / đổi email.
const ERROR_KEYS: Record<string, EmployeesErrorKey> = {
  EMPLOYEE_NOT_FOUND: "notFound",
  EMPLOYEE_ORG_UNIT_INVALID: "orgUnitInvalid",
  EMPLOYEE_OUTSIDE_OFFICE: "outsideOffice",
  EMPLOYEE_VERSION_CONFLICT: "versionConflict",
  INVALID_EMPLOYEE_STATUS_TRANSITION: "invalidTransition",
  TERMINATION_DATE_REQUIRED: "terminationDateRequired",
  EMPLOYEE_SENSITIVE_DUPLICATE: "sensitiveDuplicate",
  EMPLOYEE_ALREADY_HAS_ACCOUNT: "alreadyHasAccount",
  EMPLOYEE_TERMINATED: "terminated",
  EMAIL_ALREADY_EXISTS: "emailExists",
  ADMIN_ACCOUNT_PROTECTED: "adminProtected",
};

/** Mã lỗi gắn vào một ô của form thay vì Alert chung (tên ô trùng tên field của DTO). */
const FIELD_ERRORS: Record<string, EmployeeErrorField> = {
  EMAIL_ALREADY_EXISTS: "workEmail",
  EMPLOYEE_OUTSIDE_OFFICE: "officeId",
  TERMINATION_DATE_REQUIRED: "terminationDate",
};

/** Lỗi do dữ liệu trên màn hình đã cũ: báo rồi tải lại hồ sơ. */
const STALE_CODES = new Set(["EMPLOYEE_VERSION_CONFLICT", "INVALID_EMPLOYEE_STATUS_TRANSITION", "EMPLOYEE_ALREADY_HAS_ACCOUNT"]);

export type EmployeeErrorField = "workEmail" | "officeId" | "terminationDate";

/** `field` null = Alert chung; `stale` = nên tải lại hồ sơ. */
export type EmployeeError = { field: EmployeeErrorField | null; message: string; stale: boolean };

export function getEmployeeError(
  error: unknown,
  t: EmployeesErrorsTranslator,
  tErrors: ErrorsTranslator,
): EmployeeError {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) {
      return { field: FIELD_ERRORS[error.code] ?? null, message: t(key), stale: STALE_CODES.has(error.code) };
    }
  }
  return { field: null, message: getErrorMessage(error, tErrors), stale: false };
}

/** Lỗi đã có theo ô từ backend (validation) thì form tự gắn, không hiện thêm Alert. */
export function hasFieldErrors(error: unknown): boolean {
  return isApiError(error) && error.fieldErrors.length > 0;
}
