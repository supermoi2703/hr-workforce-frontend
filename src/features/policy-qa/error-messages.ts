import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type PolicyQaErrorKey = keyof Messages["PolicyQa"]["errors"];
/** Hàm dịch của namespace "PolicyQa.errors". */
export type PolicyQaErrorsTranslator = (key: PolicyQaErrorKey) => string;

// Mã lỗi của API hỏi đáp chính sách (README backend modules/ai mục 5). Hỏi quá nhanh (429) dùng câu chung ở Errors.
const ERROR_KEYS: Record<string, PolicyQaErrorKey> = {
  FEATURE_DISABLED: "disabled",
  AI_SERVICE_UNAVAILABLE: "unavailable",
};

export function getPolicyQaError(error: unknown, t: PolicyQaErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
