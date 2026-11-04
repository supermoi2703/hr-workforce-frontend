import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type PolicyErrorKey = keyof Messages["Policies"]["errors"];
/** Hàm dịch của namespace "Policies.errors". */
export type PolicyErrorsTranslator = (key: PolicyErrorKey) => string;

// Mã lỗi của API chính sách (README backend modules/policy mục 4).
const ERROR_KEYS: Record<string, PolicyErrorKey> = {
  POLICY_NOT_FOUND: "notFound",
  INVALID_POLICY_VALUE: "invalidValue",
  POLICY_VALUE_IN_EFFECT: "valueInEffect",
};

export function getPolicyError(error: unknown, t: PolicyErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
