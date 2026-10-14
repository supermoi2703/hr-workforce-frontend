"use client";

import { useState } from "react";
import { BombIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

/** Trang thử error boundary của khu vực đã đăng nhập (chỉ có ở menu khi chạy dev). */
export default function DevErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) throw new Error("Lỗi thử nghiệm từ /dev/error");

  return (
    <>
      <PageHeader title="Trang lỗi mẫu" description="Bấm nút để xem trang lỗi chung khi một màn hình bị lỗi lúc render." />
      <div>
        <Button variant="destructive" onClick={() => setShouldThrow(true)}>
          <BombIcon /> Gây lỗi
        </Button>
      </div>
    </>
  );
}
