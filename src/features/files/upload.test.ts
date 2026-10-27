import { afterEach, describe, expect, it, vi } from "vitest";
import { completeUpload, createUploadUrl, putToStorage } from "./api";
import { formatFileSize } from "./format";
import { FileValidationError, uploadFile, validateFile } from "./upload";

vi.mock("./api", () => ({
  createUploadUrl: vi.fn(),
  putToStorage: vi.fn(),
  completeUpload: vi.fn(),
}));

describe("validateFile", () => {
  it("chấp nhận file đúng loại và dung lượng", () => {
    expect(validateFile("LEAVE_ATTACHMENT", { type: "application/pdf", size: 1000 })).toBeNull();
  });

  it("chặn sai loại, quá dung lượng, file rỗng", () => {
    expect(validateFile("LEAVE_ATTACHMENT", { type: "text/plain", size: 10 })).toBe("FILE_TYPE_NOT_ALLOWED");
    expect(validateFile("LEAVE_ATTACHMENT", { type: "image/png", size: 5 * 1024 * 1024 + 1 })).toBe("FILE_TOO_LARGE");
    expect(validateFile("LEAVE_ATTACHMENT", { type: "image/png", size: 0 })).toBe("FILE_TOO_LARGE");
  });

  it("purpose chỉ backend ghi thì trình duyệt không được tải lên", () => {
    expect(validateFile("CHECKIN_PHOTO", { type: "image/webp", size: 10 })).toBe("FILE_UPLOAD_NOT_ALLOWED");
  });
});

describe("uploadFile", () => {
  afterEach(() => vi.clearAllMocks());

  it("gọi đủ 3 bước theo thứ tự: xin URL → PUT lên kho → xác nhận", async () => {
    const calls: string[] = [];
    const upload = { fileId: "f1", uploadUrl: "http://localhost:9000/x", method: "PUT" as const, headers: {}, expiresAt: "" };
    vi.mocked(createUploadUrl).mockImplementation(async (body) => {
      calls.push(`url:${body.contentType}:${body.sizeBytes}`);
      return upload;
    });
    vi.mocked(putToStorage).mockImplementation(async () => {
      calls.push("put");
    });
    vi.mocked(completeUpload).mockImplementation(async (id) => {
      calls.push(`complete:${id}`);
      return { id } as never;
    });

    const file = new File(["%PDF"], "don.pdf", { type: "application/pdf" });
    const result = await uploadFile("LEAVE_ATTACHMENT", file);

    expect(calls).toEqual(["url:application/pdf:4", "put", "complete:f1"]);
    expect(result.id).toBe("f1");
  });

  it("file không hợp lệ thì không gọi backend", async () => {
    const file = new File(["x"], "a.txt", { type: "text/plain" });

    await expect(uploadFile("LEAVE_ATTACHMENT", file)).rejects.toBeInstanceOf(FileValidationError);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });
});

describe("formatFileSize", () => {
  it("đổi đơn vị", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatFileSize(2560)).toBe("2,5 KB");
  });
});
