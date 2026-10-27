// Kiểu dữ liệu khớp module file của backend (modules/file trong hr-workforce-backend).

export type FilePurpose = "CHECKIN_PHOTO" | "LEAVE_ATTACHMENT";

export type FileStatus = "PENDING" | "ACTIVE" | "DELETED";

/** StoredFileResponse */
export type StoredFile = {
  id: string;
  purpose: FilePurpose;
  originalName: string | null;
  contentType: string;
  sizeBytes: number;
  status: FileStatus;
  ownerUserId: string | null;
  uploadedAt: string | null;
  createdAt: string;
};

/** CreateUploadUrlRequest */
export type CreateUploadUrlRequest = {
  purpose: FilePurpose;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

/** UploadUrlResponse: trình duyệt PUT file lên `uploadUrl` kèm đúng `headers`. */
export type UploadUrlResponse = {
  fileId: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
};

/** DownloadUrlResponse: URL đọc file có hạn ngắn. */
export type DownloadUrlResponse = {
  url: string;
  expiresAt: string;
};

/**
 * Luật tải lên phía trình duyệt, khớp FilePurpose của backend. Chỉ để báo lỗi sớm cho người dùng;
 * backend vẫn tự kiểm tra lại. Purpose không có ở đây thì trình duyệt không được tự tải lên (vd CHECKIN_PHOTO).
 */
export const CLIENT_UPLOAD_RULES: Partial<Record<FilePurpose, { contentTypes: string[]; maxSizeBytes: number }>> = {
  LEAVE_ATTACHMENT: {
    contentTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
};
