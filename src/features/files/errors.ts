import { getErrorMessage, isApiError } from "@/lib/api/errors";
import { StorageUploadError } from "./api";
import { FileValidationError } from "./upload";

// Thông báo cho các mã lỗi riêng của module file (backend ErrorCode nhóm "File storage").
const MESSAGES: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: "Loại file này không được phép.",
  FILE_TOO_LARGE: "File vượt quá dung lượng cho phép.",
  FILE_UPLOAD_NOT_ALLOWED: "Không thể tải lên loại file này từ trình duyệt.",
  FILE_UPLOAD_INCOMPLETE: "File chưa tải lên xong hoặc bị lỗi, vui lòng thử lại.",
  STORAGE_UNAVAILABLE: "Kho lưu trữ file đang không hoạt động, vui lòng thử lại sau.",
};

export function getFileErrorMessage(error: unknown): string {
  if (error instanceof FileValidationError) return MESSAGES[error.code];
  if (error instanceof StorageUploadError) {
    return error.status === 0
      ? "Không kết nối được kho lưu trữ file (kiểm tra kho đã chạy và cho phép CORS)."
      : "Kho lưu trữ từ chối file (link tải lên hết hạn hoặc file không khớp), vui lòng thử lại.";
  }
  if (isApiError(error) && MESSAGES[error.code]) return MESSAGES[error.code];
  return getErrorMessage(error);
}
