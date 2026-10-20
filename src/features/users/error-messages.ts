import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type UsersErrorKey = keyof Messages["Users"]["Errors"];
/** Hàm dịch của namespace "Users.Errors". */
export type UsersErrorsTranslator = (key: UsersErrorKey) => string;

// Mã lỗi riêng của module user (README backend §8).
const ERROR_KEYS: Record<string, UsersErrorKey> = {
  EMAIL_ALREADY_EXISTS: "emailExists",
  CANNOT_MODIFY_SELF: "cannotModifySelf",
  ADMIN_ACCOUNT_PROTECTED: "adminProtected",
  INVALID_STATUS_TRANSITION: "invalidStatus",
  ROLE_NOT_FOUND: "roleNotFound",
  ACTIVATION_RESEND_TOO_SOON: "resendTooSoon",
};

/** Lỗi của form tài khoản: gắn vào ô nào (email trùng → ô email), hoặc `null` = Alert chung. */
export type UserFormError = { field: "email" | null; message: string };

export function getUserError(error: unknown, t: UsersErrorsTranslator, tErrors: ErrorsTranslator): UserFormError {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return { field: error.code === "EMAIL_ALREADY_EXISTS" ? "email" : null, message: t(key) };
  }
  return { field: null, message: getErrorMessage(error, tErrors) };
}
