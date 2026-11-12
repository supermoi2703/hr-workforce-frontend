"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ảnh bìa tỉ lệ 16:9, cắt giữa. `src` null (bài không có ảnh, hoặc kho lỗi) thì không chiếm chỗ. Link ảnh sống vài phút
 * nên ảnh có thể lỗi khi để trang quá lâu: ẩn đi thay vì hiện icon ảnh hỏng (trang đọc tự lấy link mới sau ít phút).
 */
export function CoverImage({ src, className }: { src: string | null; className?: string }) {
  // Lỗi gắn với đúng `src` đã lỗi; đổi link mới thì thử lại.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- link ký sẵn có hạn của kho riêng tư, không qua trình tối ưu ảnh của Next
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={cn("aspect-video w-full object-cover", className)}
    />
  );
}
