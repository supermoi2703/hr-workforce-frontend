import type { Messages } from "next-intl";
import type { FieldError } from "./types";

/** Mã lỗi phát sinh ở frontend (không đến từ backend). */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  UNEXPECTED_RESPONSE: "UNEXPECTED_RESPONSE",
} as const;

/** Lỗi khi gọi API. `code` là ErrorCode của backend hoặc một mã trong CLIENT_ERROR_CODES. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];
  /** Số giây phải chờ (header `Retry-After` của lỗi 429), nếu backend gửi. */
  readonly retryAfterSeconds?: number;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: FieldError[];
    retryAfterSeconds?: number;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? [];
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type ErrorMessageKey = keyof Messages["Errors"];
/** Hàm dịch của namespace "Errors": `useTranslations("Errors")` hoặc `getTranslations("Errors")`. */
export type ErrorsTranslator = (key: ErrorMessageKey) => string;

// Mã lỗi dùng chung → key trong messages (Errors.*). Mã chưa có ở đây dùng message của backend (tiếng Anh).
// Module nào có mã lỗi riêng cần hiển thị đẹp hơn thì tự xử lý trong feature của mình.
const ERROR_MESSAGE_KEYS: Record<string, ErrorMessageKey> = {
  [CLIENT_ERROR_CODES.NETWORK_ERROR]: "network",
  [CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE]: "unexpectedResponse",
  VALIDATION_ERROR: "validation",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  RESOURCE_NOT_FOUND: "notFound",
  CONFLICT: "conflict",
  TOO_MANY_REQUESTS: "tooManyRequests",
  INTERNAL_ERROR: "internal",
};

/**
 * Thông báo lỗi để hiển thị cho người dùng, theo ngôn ngữ đang chọn.
 * Trong component dùng hook `useErrorMessage()` (lib/api/use-error-message) cho gọn.
 */
export function getErrorMessage(error: unknown, t: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_MESSAGE_KEYS[error.code];
    return key ? t(key) : error.message || t("generic");
  }
  return t("generic");
}
