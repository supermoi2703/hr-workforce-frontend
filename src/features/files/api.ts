import { http, type RequestOptions } from "@/lib/api/http-client";
import type { CreateUploadUrlRequest, DownloadUrlResponse, StoredFile, UploadUrlResponse } from "./types";

// `options` cho phép trang thử (/dev/storage) gắn token tay khi frontend chưa có đăng nhập thật.
type CallOptions = Pick<RequestOptions, "headers" | "signal">;

export const createUploadUrl = (body: CreateUploadUrlRequest, options?: CallOptions) =>
  http.post<UploadUrlResponse>("/api/files/upload-url", body, options);

export const completeUpload = (fileId: string, options?: CallOptions) =>
  http.post<StoredFile>(`/api/files/${fileId}/complete`, undefined, options);

export const getFile = (fileId: string, options?: CallOptions) =>
  http.get<StoredFile>(`/api/files/${fileId}`, options);

export const getDownloadUrl = (fileId: string, options?: CallOptions) =>
  http.get<DownloadUrlResponse>(`/api/files/${fileId}/download-url`, options);

export class StorageUploadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Storage upload failed (HTTP ${status})`);
    this.name = "StorageUploadError";
    this.status = status;
  }
}

/**
 * PUT nội dung file thẳng lên kho (MinIO/Supabase) bằng presigned URL. Đây là request tới kho, không phải
 * tới backend, nên không dùng `http` (không gắn token, không bọc ApiResponse). Dùng XMLHttpRequest vì fetch
 * chưa báo được tiến trình tải lên.
 */
export function putToStorage(
  upload: UploadUrlResponse,
  file: Blob,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(upload.method, upload.uploadUrl);
    for (const [name, value] of Object.entries(upload.headers)) {
      // Content-Length do trình duyệt tự đặt theo nội dung, không được ghi đè.
      if (name.toLowerCase() !== "content-length") xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new StorageUploadError(xhr.status)));
    xhr.onerror = () => reject(new StorageUploadError(0));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
