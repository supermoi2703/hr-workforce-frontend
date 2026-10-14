"use client";

import type { ReactNode } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { RequireAccess } from "@/components/shared/require-access";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { ApiError } from "@/lib/api/errors";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { FormDemo } from "./_components/form-demo";
import { TableDemo } from "./_components/table-demo";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const sampleError = new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Network error" });

/** Trang trình diễn component dùng chung, kèm cách dùng mẫu (xem mã nguồn từng phần). */
export default function DevUiPage() {
  return (
    <>
      <PageHeader
        title="Component mẫu"
        description="Các component dùng chung và cách dùng. Mã nguồn: src/app/(dashboard)/dev/ui."
        actions={<Button onClick={() => toast.success("Ví dụ nút hành động")}>Nút hành động</Button>}
      />

      <Section title="DataTable" description="Phân trang và sắp xếp phía server, đủ trạng thái đang tải / lỗi / rỗng.">
        <TableDemo />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Form" description="react-hook-form + zod, gắn lỗi validation từ backend vào đúng ô.">
          <FormDemo />
        </Section>

        <Section title="Thông báo & xác nhận">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success("Đã lưu thành công")}>
              Toast thành công
            </Button>
            <Button variant="outline" onClick={() => toast.error("Không lưu được dữ liệu")}>
              Toast lỗi
            </Button>
            <ConfirmDialog
              trigger={<Button variant="destructive" />}
              triggerLabel={
                <>
                  <Trash2Icon /> Xóa
                </>
              }
              title="Xóa bản ghi này?"
              description="Thao tác không thể hoàn tác."
              confirmLabel="Xóa"
              destructive
              onConfirm={() => new Promise((resolve) => setTimeout(resolve, 800)).then(() => toast.success("Đã xóa"))}
            />
          </div>
        </Section>

        <Section title="Trạng thái" description="LoadingState, ErrorState, EmptyState.">
          <div className="space-y-4">
            <LoadingState />
            <ErrorState error={sampleError} onRetry={() => toast("Thử lại")} />
            <EmptyState description="Bấm Thêm mới để tạo bản ghi đầu tiên." action={<Button size="sm">Thêm mới</Button>} />
          </div>
        </Section>

        <Section title="Phân quyền & định dạng">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span>Nút chỉ ADMIN/HR thấy:</span>
              <RequireAccess access={{ roles: ["ADMIN", "HR"] }} fallback={<Badge variant="outline">ẩn với vai trò này</Badge>}>
                <Button size="sm">Duyệt lương</Button>
              </RequireAccess>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>Badge trạng thái:</span>
              <Badge variant="success">Đúng giờ</Badge>
              <Badge variant="warning">Đi muộn</Badge>
              <Badge variant="info">WFH</Badge>
              <Badge variant="destructive">Vắng</Badge>
              <Badge variant="secondary">Nháp</Badge>
            </div>
            <ul className="space-y-1 text-muted-foreground">
              <li>formatDate: {formatDate("2026-10-13")}</li>
              <li>formatDateTime: {formatDateTime("2026-10-13T01:30:00Z")}</li>
              <li>formatCurrency: {formatCurrency(15_500_000)}</li>
            </ul>
          </div>
        </Section>
      </div>
    </>
  );
}
