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

const GOOGLE_KEYS: Record<string, AuthErrorKey> = {
  ...ACCOUNT_KEYS,
  ACCOUNT_NOT_FOUND: "googleAccountNotFound",
  GOOGLE_EMAIL_NOT_VERIFIED: "googleEmailNotVerified",
  GOOGLE_ACCOUNT_CONFLICT: "googleAccountConflict",
  TOO_MANY_REQUESTS: "googleTooManyRequests",
};

export type LoginNotice = { message: string; tone: "info" | "error" };

/**
 * Thông báo cho `/login?reason=...`: AppShell gắn lý do khi phiên đang dùng bị kết thúc
 * (hết hạn / bị thu hồi, hoặc tài khoản vừa bị khóa / vô hiệu hóa). Giá trị lạ thì không báo.
 */
export function getSessionEndNotice(reason: string | null | undefined, t: AuthErrorsTranslator): LoginNotice | null {
  if (reason === "session_expired") return { message: t("sessionExpired"), tone: "info" };
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
