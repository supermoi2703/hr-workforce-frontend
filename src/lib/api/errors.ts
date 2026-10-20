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

// Thông báo tiếng Việt cho các mã lỗi dùng chung. Mã chưa có ở đây sẽ dùng message của backend.
// Module nào có mã lỗi riêng cần hiển thị đẹp hơn thì tự xử lý trong feature của mình.
const MESSAGES: Record<string, string> = {
  [CLIENT_ERROR_CODES.NETWORK_ERROR]: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.",
  [CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE]: "Máy chủ trả về dữ liệu không hợp lệ.",
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  RESOURCE_NOT_FOUND: "Không tìm thấy dữ liệu.",
  CONFLICT: "Dữ liệu đã bị thay đổi hoặc bị trùng, vui lòng tải lại và thử lại.",
  TOO_MANY_REQUESTS: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
  INTERNAL_ERROR: "Có lỗi xảy ra ở máy chủ, vui lòng thử lại sau.",
};

/** Thông báo lỗi để hiển thị cho người dùng. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return MESSAGES[error.code] ?? error.message;
  }
  return "Đã có lỗi xảy ra, vui lòng thử lại.";
}
