import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type TransfersErrorKey = keyof Messages["Transfers"]["Errors"];
/** Hàm dịch của namespace "Transfers.Errors". */
export type TransfersErrorsTranslator = (key: TransfersErrorKey) => string;

// Mã lỗi của module transfer (README backend transfer mục 5) và lỗi hồ sơ gặp khi đề xuất.
const ERROR_KEYS: Record<string, TransfersErrorKey> = {
  TRANSFER_NOT_FOUND: "notFound",
  TRANSFER_SELF: "self",
  TRANSFER_EMPLOYEE_ONBOARDING: "onboarding",
  TRANSFER_ALREADY_OPEN: "alreadyOpen",
  TRANSFER_NO_CHANGE: "noChange",
  TRANSFER_INVALID_DATE: "invalidDate",
  TRANSFER_NOT_CANCELLABLE: "notCancellable",
  EMPLOYEE_ORG_UNIT_INVALID: "orgUnitInvalid",
  EMPLOYEE_TERMINATED: "terminated",
  EMPLOYEE_NOT_FOUND: "employeeNotFound",
};

export type TransferErrorField = "effectiveDate";

/** Mã lỗi gắn vào một ô của form thay vì Alert chung (tên ô trùng tên field của DTO). */
const FIELD_ERRORS: Record<string, TransferErrorField> = {
  TRANSFER_INVALID_DATE: "effectiveDate",
};

/** Dữ liệu trên màn hình đã cũ: báo rồi tải lại danh sách. */
const STALE_CODES = new Set(["TRANSFER_ALREADY_OPEN", "TRANSFER_NOT_CANCELLABLE", "TRANSFER_NOT_FOUND"]);

/** `field` null = Alert chung; `stale` = nên tải lại danh sách điều chuyển. */
export type TransferError = { field: TransferErrorField | null; message: string; stale: boolean };

export function getTransferError(error: unknown, t: TransfersErrorsTranslator, tErrors: ErrorsTranslator): TransferError {
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
