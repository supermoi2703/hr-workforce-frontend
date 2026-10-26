"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePreview } from "@/features/files/components/file-preview";
import { FileUploadField } from "@/features/files/components/file-upload-field";
import { formatFileSize } from "@/features/files/format";
import type { StoredFile } from "@/features/files/types";

/**
 * Trang thử kho file (chỉ có khi chạy dev): tải lên qua presigned URL rồi xem lại.
 * Frontend chưa có đăng nhập thật nên cho dán access token lấy từ Swagger (POST /api/auth/login).
 */
export default function DevStoragePage() {
  const [token, setToken] = useState("");
  const [uploaded, setUploaded] = useState<StoredFile | null>(null);

  const headers = useMemo<HeadersInit | undefined>(
    () => (token.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined),
    [token],
  );

  return (
    <>
      <PageHeader
        title="Thử kho file"
        description="Chọn file → tải thẳng lên kho (MinIO/Supabase) qua presigned URL → xác nhận → xem lại bằng link có hạn."
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Access token</CardTitle>
          <CardDescription>
            Đăng nhập ở Swagger (http://localhost:8080/swagger-ui.html), chép <code>accessToken</code> vào đây. Token sống 15 phút.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="dev-token">Bearer token</Label>
          <Input id="dev-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJhbGciOi..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Tải lên đính kèm đơn từ</CardTitle>
          <CardDescription>Purpose LEAVE_ATTACHMENT: PDF, JPG, PNG, tối đa 5 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadField
            purpose="LEAVE_ATTACHMENT"
            label="Chọn file"
            requestHeaders={headers}
            onUploaded={setUploaded}
            disabled={!headers}
          />
        </CardContent>
      </Card>

      {uploaded && (
        <Card>
          <CardHeader>
            <CardTitle>3. Xem lại</CardTitle>
            <CardDescription>
              id {uploaded.id} · {uploaded.contentType} · {formatFileSize(uploaded.sizeBytes)} · {uploaded.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FilePreview
              fileId={uploaded.id}
              contentType={uploaded.contentType}
              name={uploaded.originalName}
              requestHeaders={headers}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
