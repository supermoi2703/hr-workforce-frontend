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
  // Vai trò
  ROLE_CODE_EXISTS: "roleCodeExists",
  ROLE_IN_USE: "roleInUse",
  SYSTEM_ROLE_PROTECTED: "systemRoleProtected",
  PERMISSION_NOT_FOUND: "permissionNotFound",
};

/** Mã lỗi gắn vào một ô của form thay vì Alert chung. */
const FIELD_ERRORS: Record<string, "email" | "code"> = {
  EMAIL_ALREADY_EXISTS: "email",
  ROLE_CODE_EXISTS: "code",
};

/** Lỗi của form tài khoản / vai trò: gắn vào ô nào (email trùng → ô email, mã role trùng → ô mã), hoặc `null` = Alert chung. */
export type UserFormError = { field: "email" | "code" | null; message: string };

export function getUserError(error: unknown, t: UsersErrorsTranslator, tErrors: ErrorsTranslator): UserFormError {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return { field: FIELD_ERRORS[error.code] ?? null, message: t(key) };
  }
  return { field: null, message: getErrorMessage(error, tErrors) };
}
