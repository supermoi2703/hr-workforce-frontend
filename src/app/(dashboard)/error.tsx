"use client";

import { useEffect } from "react";
import { CircleAlertIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// Lỗi không lường trước khi render một trang trong khu vực đã đăng nhập. Sidebar/header vẫn giữ nguyên.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Trang gặp lỗi</EmptyTitle>
        <EmptyDescription>
          Đã có lỗi không mong muốn khi hiển thị trang này.
          {error.digest && <> Mã lỗi: {error.digest}</>}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={() => retry()}>
          <RotateCwIcon /> Thử lại
        </Button>
      </EmptyContent>
    </Empty>
  );
}
