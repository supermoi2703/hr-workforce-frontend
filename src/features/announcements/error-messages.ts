import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type AnnouncementsErrorKey = keyof Messages["Announcements"]["Errors"];
/** Hàm dịch của namespace "Announcements.Errors". */
export type AnnouncementsErrorsTranslator = (key: AnnouncementsErrorKey) => string;

// Mã lỗi của module announcement (README backend announcement mục 4).
const ERROR_KEYS: Record<string, AnnouncementsErrorKey> = {
  ANNOUNCEMENT_NOT_FOUND: "notFound",
  ANNOUNCEMENT_AUDIENCE_INVALID: "audienceInvalid",
  ANNOUNCEMENT_AUDIENCE_FORBIDDEN: "audienceForbidden",
  ANNOUNCEMENT_AUDIENCE_LOCKED: "audienceLocked",
  ANNOUNCEMENT_INVALID_STATE: "invalidState",
  ANNOUNCEMENT_VERSION_CONFLICT: "versionConflict",
  ANNOUNCEMENT_COVER_INVALID: "coverInvalid",
  ANNOUNCEMENT_CATEGORY_NOT_FOUND: "categoryNotFound",
  ANNOUNCEMENT_CATEGORY_INVALID: "categoryInvalid",
  ANNOUNCEMENT_CATEGORY_FORBIDDEN: "categoryForbidden",
  ANNOUNCEMENT_CATEGORY_NAME_EXISTS: "categoryNameExists",
  ANNOUNCEMENT_CATEGORY_NAME_EN_EXISTS: "categoryNameEnExists",
};

/** Dữ liệu trên màn hình đã cũ: báo rồi tải lại danh sách và bài đang mở. */
const STALE_CODES = new Set([
  "ANNOUNCEMENT_NOT_FOUND",
  "ANNOUNCEMENT_INVALID_STATE",
  "ANNOUNCEMENT_VERSION_CONFLICT",
  "ANNOUNCEMENT_AUDIENCE_LOCKED",
  "ANNOUNCEMENT_CATEGORY_NOT_FOUND",
  "ANNOUNCEMENT_CATEGORY_INVALID",
]);

/** `stale` = nên tải lại danh sách và bài đang mở. */
export type AnnouncementError = { message: string; stale: boolean };

export function getAnnouncementError(
  error: unknown,
  t: AnnouncementsErrorsTranslator,
  tErrors: ErrorsTranslator,
): AnnouncementError {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return { message: t(key), stale: STALE_CODES.has(error.code) };
  }
  return { message: getErrorMessage(error, tErrors), stale: false };
}

/** Lỗi đã có theo ô từ backend (validation) thì form tự gắn, không hiện thêm Alert. */
export function hasFieldErrors(error: unknown): boolean {
  return isApiError(error) && error.fieldErrors.length > 0;
}
