import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type ApprovalErrorKey = keyof Messages["Approvals"]["errors"];
/** Hàm dịch của namespace "Approvals.errors". */
export type ApprovalErrorsTranslator = (key: ApprovalErrorKey) => string;

// Mã lỗi riêng của bộ máy duyệt (README backend modules/approval mục 5).
const ERROR_KEYS: Record<string, ApprovalErrorKey> = {
  APPROVAL_NOT_FOUND: "notFound",
  NOT_CURRENT_APPROVER: "notCurrentApprover",
  APPROVAL_ALREADY_DECIDED: "alreadyDecided",
  APPROVAL_NOT_PENDING: "notPending",
  // Rút đơn của người khác
  FORBIDDEN: "notRequester",
};

/**
 * Lỗi cho thấy dữ liệu trên màn hình đã cũ (người khác vừa duyệt, đơn vừa kết thúc / bị rút): báo lỗi xong thì tải lại
 * chi tiết và danh sách.
 */
const STALE_CODES = new Set(["NOT_CURRENT_APPROVER", "APPROVAL_ALREADY_DECIDED", "APPROVAL_NOT_PENDING"]);

export function isStaleApprovalError(error: unknown): boolean {
  return isApiError(error) && STALE_CODES.has(error.code);
}

export function getApprovalError(error: unknown, t: ApprovalErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
