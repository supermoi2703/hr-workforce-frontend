"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ảnh bìa tỉ lệ 16:9 (đổi bằng `className`, vd `aspect-square`), cắt giữa. `src` null (bài không có ảnh, hoặc kho lỗi)
 * thì không chiếm chỗ.
 *
 * Hiệu ứng nhẹ, đều tắt khi người dùng bật "giảm chuyển động" của hệ điều hành:
 *  - ảnh hiện dần khi tải xong (nền xám nhạt trong lúc chờ, không bị nhảy hình);
 *  - phóng nhẹ khi rê chuột lên phần tử cha có lớp `group` (thẻ bài). Khung có `overflow-hidden` nên ảnh không tràn.
 *
 * Link ảnh sống vài phút nên ảnh có thể lỗi khi để trang quá lâu: ẩn đi thay vì hiện icon ảnh hỏng (trang đọc tự lấy
 * link mới sau ít phút).
 */
export function CoverImage({ src, className }: { src: string | null; className?: string }) {
  // Trạng thái gắn với đúng `src`; đổi link mới thì thử lại từ đầu.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- link ký sẵn có hạn của kho riêng tư, không qua trình tối ưu ảnh của Next */}
      <img
        src={src}
        alt=""
        loading="lazy"
        // Ảnh đã có sẵn trong bộ nhớ đệm có thể tải xong trước khi `onLoad` được gắn: kiểm tra `complete`
        ref={(img) => {
          if (img && img.complete && img.naturalWidth > 0 && loadedSrc !== src) setLoadedSrc(src);
        }}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={cn(
          "size-full object-cover transition duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          loadedSrc === src ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
