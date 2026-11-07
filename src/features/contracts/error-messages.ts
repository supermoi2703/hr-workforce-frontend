import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type ContractsErrorKey = keyof Messages["Contracts"]["Errors"];
/** Hàm dịch của namespace "Contracts.Errors". */
export type ContractsErrorsTranslator = (key: ContractsErrorKey) => string;

// Mã lỗi của module contract (README backend contract mục 3).
const ERROR_KEYS: Record<string, ContractsErrorKey> = {
  CONTRACT_NOT_FOUND: "notFound",
  CONTRACT_NUMBER_EXISTS: "numberExists",
  CONTRACT_OVERLAP: "overlap",
  CONTRACT_INVALID_DATES: "invalidDates",
  CONTRACT_NOT_EDITABLE: "notEditable",
  CONTRACT_VERSION_CONFLICT: "versionConflict",
  CONTRACT_SALARY_NOT_FOUND: "salaryNotFound",
  CONTRACT_SALARY_LOCKED: "salaryLocked",
  CONTRACT_SALARY_OUT_OF_RANGE: "salaryOutOfRange",
  EMPLOYEE_TERMINATED: "employeeTerminated",
  EMPLOYEE_NOT_FOUND: "employeeNotFound",
};

export type ContractErrorField = "contractNumber" | "effectiveFrom";

/** Mã lỗi gắn vào một ô của form thay vì Alert chung. */
const FIELD_ERRORS: Record<string, ContractErrorField> = {
  CONTRACT_NUMBER_EXISTS: "contractNumber",
  CONTRACT_SALARY_OUT_OF_RANGE: "effectiveFrom",
};

/** Dữ liệu trên màn hình đã cũ: báo rồi tải lại hợp đồng. */
const STALE_CODES = new Set([
  "CONTRACT_VERSION_CONFLICT",
  "CONTRACT_NOT_EDITABLE",
  "CONTRACT_SALARY_LOCKED",
  "CONTRACT_SALARY_NOT_FOUND",
]);

/** `field` null = Alert chung; `stale` = nên tải lại hợp đồng. */
export type ContractError = { field: ContractErrorField | null; message: string; stale: boolean };

export function getContractError(
  error: unknown,
  t: ContractsErrorsTranslator,
  tErrors: ErrorsTranslator,
): ContractError {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return { field: FIELD_ERRORS[error.code] ?? null, message: t(key), stale: STALE_CODES.has(error.code) };
  }
  return { field: null, message: getErrorMessage(error, tErrors), stale: false };
}

/** Lỗi đã có theo ô từ backend (validation) thì form tự gắn, không hiện thêm Alert. */
export function hasFieldErrors(error: unknown): boolean {
  return isApiError(error) && error.fieldErrors.length > 0;
}
