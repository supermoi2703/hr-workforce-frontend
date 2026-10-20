import { CLIENT_ERROR_CODES, isApiError } from "@/lib/api/errors";

// TODO(i18n): chuyển chữ hiển thị sang file dịch khi làm đa ngôn ngữ.
// Tạm viết tiếng Anh; không dùng getErrorMessage (đang trả tiếng Việt) để trang không lẫn hai ngôn ngữ.

const CONTACT_HR = "Contact HR";
const GENERIC = "Something went wrong. Please try again.";

const ACCOUNT_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_ACTIVATED: "Your account is not activated yet. Use the code in your invitation email to activate it.",
  ACCOUNT_LOCKED: `Your account is locked. ${CONTACT_HR} to unlock it.`,
  ACCOUNT_DISABLED: `Your account has been disabled. ${CONTACT_HR} if you need access again.`,
};

const COMMON_MESSAGES: Record<string, string> = {
  [CLIENT_ERROR_CODES.NETWORK_ERROR]: "Can't reach the server. Check your connection and try again.",
  [CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE]: "The server returned an unexpected response. Please try again.",
  VALIDATION_ERROR: "Some fields are invalid. Please check and try again.",
  INTERNAL_ERROR: "Something went wrong on the server. Please try again later.",
};

/** "in 15 minutes" từ số giây của Retry-After; không có thì "in a few minutes". */
function retryAfterText(seconds?: number): string {
  if (seconds === undefined) return "in a few minutes";
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** Thông báo cho lỗi khi đăng nhập bằng email và mật khẩu. */
export function getLoginErrorMessage(error: unknown): string {
  if (!isApiError(error)) return GENERIC;
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      // Backend cố ý không phân biệt sai email hay sai mật khẩu.
      return "Incorrect email or password.";
    case "TOO_MANY_REQUESTS":
      return `Too many failed sign-in attempts. Try again ${retryAfterText(error.retryAfterSeconds)}.`;
    default:
      // Message của backend đã là tiếng Anh; chỉ dùng khi không có câu riêng.
      return ACCOUNT_MESSAGES[error.code] ?? COMMON_MESSAGES[error.code] ?? (error.message || GENERIC);
  }
}

const GOOGLE_MESSAGES: Record<string, string> = {
  ...ACCOUNT_MESSAGES,
  ACCOUNT_NOT_FOUND: `This Google email doesn't have an account. ${CONTACT_HR} to get one.`,
  GOOGLE_EMAIL_NOT_VERIFIED: "Your Google email isn't verified. Verify it with Google, then try again.",
  GOOGLE_ACCOUNT_CONFLICT:
    "This account is linked to a different Google account. Sign in with that Google account or with your password.",
  TOO_MANY_REQUESTS: "Too many Google sign-in attempts. Try again in a few minutes.",
};

/**
 * Thông báo cho mã lỗi backend gắn lên URL sau khi đăng nhập Google thất bại (`/login?error=CODE`).
 * Trả null khi không cần báo gì (không có mã, hoặc người dùng tự bấm Hủy ở Google).
 * Mã lạ chỉ hiện câu chung, không hiện nguyên giá trị trên URL.
 */
export function getGoogleErrorMessage(code?: string | null): string | null {
  if (!code || code === "GOOGLE_LOGIN_CANCELLED") return null;
  return GOOGLE_MESSAGES[code] ?? "Google sign-in failed. Please try again.";
}
