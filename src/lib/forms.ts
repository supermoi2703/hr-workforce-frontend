import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "./api/errors";

/**
 * Đưa lỗi validation từ backend (ApiResponse.errors) vào đúng ô của form react-hook-form.
 * Trả về true nếu đã gắn được ít nhất một lỗi theo ô; false thì nên hiện thông báo chung (toast).
 *
 * Tên `field` của backend phải trùng tên field trong form (cùng tên với DTO request).
 */
export function applyServerFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!isApiError(error) || error.fieldErrors.length === 0) return false;
  error.fieldErrors.forEach((fieldError, index) => {
    setError(fieldError.field as Path<T>, { type: "server", message: fieldError.message }, { shouldFocus: index === 0 });
  });
  return true;
}
