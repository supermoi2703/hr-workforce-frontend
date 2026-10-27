# Feature `files` — Tải lên và xem file

Phía frontend của module `file` ở backend (`hr-workforce-backend/.../modules/file/README.md`). File đi thẳng từ
trình duyệt lên kho (MinIO khi chạy local, Supabase Storage trên cloud) qua presigned URL, không đi qua backend.

```
files/
├── types.ts                       kiểu khớp DTO backend + luật tải lên theo purpose
├── api.ts                         gọi /api/files/*; putToStorage (PUT thẳng lên kho, có tiến trình)
├── upload.ts                      uploadFile: xin URL → PUT lên kho → xác nhận; validateFile
├── hooks.ts                       useFileUpload (tiến trình, hủy, lỗi), useDownloadUrl (tự làm mới link)
├── errors.ts                      thông báo tiếng Việt cho lỗi file
├── format.ts                      formatFileSize, isImage
└── components/
    ├── file-upload-field.tsx      nút chọn file + thanh tiến trình + kết quả
    └── file-preview.tsx           ảnh thì hiện ảnh, file khác thì hiện link mở
```

## Nằm ở đâu trong frontend

Mỗi module backend ứng với một thư mục `src/features/<module>`. Giao diện chung và trang (route) nằm ở chỗ khác:

| Thư mục | Chứa gì | Với tính năng file |
|---|---|---|
| `src/features/files/` | Toàn bộ logic + component của một module (giống `modules/file` ở backend) | Mọi file trong bảng trên |
| `src/app/(dashboard)/...` | Trang theo URL, chỉ ghép component từ `features` | `dev/storage/page.tsx` → `/dev/storage` (trang thử) |
| `src/components/ui/` | Component giao diện chung (shadcn: Button, Card, Input...) | Được dùng lại, không sửa |
| `src/lib/api/` | Client `http` gọi backend, xử lý lỗi `ApiResponse` | `api.ts` gọi qua `http` |

## Vì sao chỉ lưu `fileId`, không lưu URL

Bucket là private, URL xem file chỉ sống 10 phút (xem README backend mục 2.4). Form nghiệp vụ gửi **`fileId`**; lúc
hiển thị, `FilePreview` tự xin URL mới và làm mới mỗi 8 phút. Không lưu `url` vào state lâu dài hay gửi lên backend.

## Dùng trong form nghiệp vụ

```tsx
<FileUploadField purpose="LEAVE_ATTACHMENT" onUploaded={(file) => form.setValue("attachmentFileId", file.id)} />
```

Form chỉ gửi `attachmentFileId` lên backend, không gửi nội dung file. Xem lại file đã lưu:

```tsx
<FilePreview fileId={request.attachmentFileId} contentType={request.attachmentContentType} />
```

## Thử bằng tay

1. Backend chạy với `app.storage.enabled=true`, `docker compose up -d minio`.
2. `npm run dev`, mở http://localhost:3000/dev/storage.
3. Dán access token (đăng nhập ở Swagger), chọn một file PDF/JPG/PNG dưới 5 MB, xem tiến trình rồi xem lại.

Trang `/dev/storage` cho dán token vì frontend chưa có đăng nhập thật. Khi đăng nhập thật xong (`lib/auth`), bỏ
`requestHeaders`: `http` tự gắn token.
