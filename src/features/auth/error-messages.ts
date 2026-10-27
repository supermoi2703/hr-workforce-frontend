import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type AuthErrorKey = keyof Messages["Auth"]["Errors"];
/** Hàm dịch của namespace "Auth.Errors": `useTranslations("Auth.Errors")`. */
export type AuthErrorsTranslator = (key: AuthErrorKey, values?: Record<string, number>) => string;

const ACCOUNT_KEYS: Record<string, AuthErrorKey> = {
  ACCOUNT_NOT_ACTIVATED: "accountNotActivated",
  ACCOUNT_LOCKED: "accountLocked",
  ACCOUNT_DISABLED: "accountDisabled",
};

/**
 * Thông báo cho lỗi khi đăng nhập bằng email và mật khẩu.
 * Mã không thuộc riêng phần đăng nhập (mất mạng, lỗi server...) dùng thông báo chung (namespace "Errors").
 */
export function getLoginErrorMessage(error: unknown, t: AuthErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    // Backend cố ý không phân biệt sai email hay sai mật khẩu.
    if (error.code === "INVALID_CREDENTIALS") return t("invalidCredentials");
    if (error.code === "TOO_MANY_REQUESTS") {
      const seconds = error.retryAfterSeconds;
      return seconds === undefined
        ? t("tooManyAttemptsSoon")
        : t("tooManyAttempts", { minutes: Math.max(1, Math.ceil(seconds / 60)) });
    }
    const key = ACCOUNT_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}

/** Lỗi của form dùng mã xác thực (đặt lại mật khẩu, kích hoạt): gắn vào ô nào, hoặc `null` = hiện Alert chung. */
export type CodeFlowError = { field: "otp" | "password" | null; message: string };

/** Phân loại lỗi của POST /password/reset, /activation, /password/forgot, /activation/resend. */
export function getCodeFlowError(error: unknown, t: AuthErrorsTranslator, tErrors: ErrorsTranslator): CodeFlowError {
  if (isApiError(error)) {
    switch (error.code) {
      case "INVALID_OTP":
        return { field: "otp", message: t("invalidOtp") };
      case "WEAK_PASSWORD":
        return { field: "password", message: t("weakPassword") };
      case "PASSWORD_REUSED":
        return { field: "password", message: t("passwordReused") };
      case "TOO_MANY_REQUESTS": {
        const seconds = error.retryAfterSeconds;
        const message =
          seconds === undefined
            ? t("tooManyRequestsSoon")
            : t("tooManyRequests", { minutes: Math.max(1, Math.ceil(seconds / 60)) });
        return { field: null, message };
      }
    }
  }
  return { field: null, message: getErrorMessage(error, tErrors) };
}

/**
 * Câu cho Alert chung của form dùng mã xác thực, hoặc null khi lỗi đã hiện ở một ô
 * (mã sai, mật khẩu yếu / trùng, hay lỗi validation theo từng ô của backend).
 */
export function getCodeFlowAlert(error: unknown, t: AuthErrorsTranslator, tErrors: ErrorsTranslator): string | null {
  if (!error || (isApiError(error) && error.fieldErrors.length > 0)) return null;
  const { field, message } = getCodeFlowError(error, t, tErrors);
  return field ? null : message;
}

/** Lỗi khi đổi mật khẩu: gắn vào ô nào, hoặc `null` = Alert chung. `noPassword`: tài khoản chưa có mật khẩu. */
export type ChangePasswordError = {
  field: "currentPassword" | "newPassword" | null;
  message: string;
  noPassword?: boolean;
};

/** Phân loại lỗi của POST /api/auth/password/change. */
export function getChangePasswordError(
  error: unknown,
  t: AuthErrorsTranslator,
  tErrors: ErrorsTranslator,
): ChangePasswordError {
  if (isApiError(error)) {
    switch (error.code) {
      case "CURRENT_PASSWORD_INCORRECT":
        return { field: "currentPassword", message: t("currentPasswordIncorrect") };
      case "NO_PASSWORD_SET":
        return { field: null, message: t("noPasswordSet"), noPassword: true };
    }
  }
  // Mật khẩu yếu / trùng, quá nhiều lần: cùng cách xử lý với form dùng mã xác thực.
  const { field, message } = getCodeFlowError(error, t, tErrors);
  return { field: field === "password" ? "newPassword" : null, message };
}

const GOOGLE_KEYS: Record<string, AuthErrorKey> = {
  ...ACCOUNT_KEYS,
  ACCOUNT_NOT_FOUND: "googleAccountNotFound",
  GOOGLE_EMAIL_NOT_VERIFIED: "googleEmailNotVerified",
  GOOGLE_ACCOUNT_CONFLICT: "googleAccountConflict",
  TOO_MANY_REQUESTS: "googleTooManyRequests",
};

export type LoginNotice = {
  message: string;
  tone: "info" | "error";
  /** Link đi kèm, vd "Kích hoạt tài khoản" khi tài khoản chưa kích hoạt. */
  action?: { href: string; label: string };
};

/** Lý do gắn lên /login?reason= khi tự đăng nhập sau bước đặt lại mật khẩu / kích hoạt không thành công. */
export const LOGIN_REASON_PASSWORD_RESET = "password_reset";
export const LOGIN_REASON_ACCOUNT_ACTIVATED = "account_activated";

/**
 * Thông báo cho `/login?reason=...`:
 * - AppShell gắn khi phiên đang dùng bị kết thúc (hết hạn / bị thu hồi, tài khoản vừa bị khóa / vô hiệu hóa);
 * - trang đặt lại mật khẩu / kích hoạt gắn khi đã xong nhưng tự đăng nhập không được.
 * Giá trị lạ thì không báo.
 */
export function getSessionEndNotice(reason: string | null | undefined, t: AuthErrorsTranslator): LoginNotice | null {
  if (reason === "session_expired") return { message: t("sessionExpired"), tone: "info" };
  if (reason === LOGIN_REASON_PASSWORD_RESET) return { message: t("passwordResetDone"), tone: "info" };
  if (reason === LOGIN_REASON_ACCOUNT_ACTIVATED) return { message: t("accountActivatedDone"), tone: "info" };
  const key = reason ? ACCOUNT_KEYS[reason] : undefined;
  return key && reason !== "ACCOUNT_NOT_ACTIVATED" ? { message: t(key), tone: "error" } : null;
}

/**
 * Thông báo cho mã lỗi backend gắn lên URL sau khi đăng nhập Google thất bại (`/login?error=CODE`).
 * Trả null khi không cần báo gì (không có mã, hoặc người dùng tự bấm Hủy ở Google).
 * Mã lạ chỉ hiện câu chung, không hiện nguyên giá trị trên URL.
 */
export function getGoogleErrorMessage(code: string | null | undefined, t: AuthErrorsTranslator): string | null {
  if (!code || code === "GOOGLE_LOGIN_CANCELLED") return null;
  return t(GOOGLE_KEYS[code] ?? "googleFailed");
}
