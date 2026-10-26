import { completeUpload, createUploadUrl, putToStorage } from "./api";
import { CLIENT_UPLOAD_RULES, type FilePurpose, type StoredFile } from "./types";

export type UploadOptions = {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

/** Lỗi phát hiện ở trình duyệt trước khi gọi backend. */
export class FileValidationError extends Error {
  readonly code: "FILE_TYPE_NOT_ALLOWED" | "FILE_TOO_LARGE" | "FILE_UPLOAD_NOT_ALLOWED";

  constructor(code: FileValidationError["code"]) {
    super(code);
    this.name = "FileValidationError";
    this.code = code;
  }
}

/** Kiểm tra sớm theo luật của purpose. Trả về mã lỗi, hoặc null nếu hợp lệ. */
export function validateFile(purpose: FilePurpose, file: Pick<File, "type" | "size">): FileValidationError["code"] | null {
  const rules = CLIENT_UPLOAD_RULES[purpose];
  if (!rules) return "FILE_UPLOAD_NOT_ALLOWED";
  if (!rules.contentTypes.includes(file.type)) return "FILE_TYPE_NOT_ALLOWED";
  if (file.size <= 0 || file.size > rules.maxSizeBytes) return "FILE_TOO_LARGE";
  return null;
}

/**
 * Tải một file lên theo 3 bước (modules/file/README.md mục 3.2 ở backend):
 * 1. xin presigned URL từ backend, 2. PUT thẳng lên kho, 3. báo backend xác nhận.
 * Trả về file đã ACTIVE; gửi `id` của nó kèm form nghiệp vụ (vd đơn nghỉ).
 */
export async function uploadFile(purpose: FilePurpose, file: File, options: UploadOptions = {}): Promise<StoredFile> {
  const invalid = validateFile(purpose, file);
  if (invalid) throw new FileValidationError(invalid);

  const callOptions = { headers: options.headers, signal: options.signal };
  const upload = await createUploadUrl(
    { purpose, fileName: file.name, contentType: file.type, sizeBytes: file.size },
    callOptions,
  );
  await putToStorage(upload, file, options.onProgress, options.signal);
  return completeUpload(upload.fileId, callOptions);
}
