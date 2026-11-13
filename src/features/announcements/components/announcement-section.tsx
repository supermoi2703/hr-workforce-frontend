"use client";

import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { clampIndex, dragTransform, nextIndex, prevIndex } from "../carousel";
import { useCategoryName } from "../hooks";
import { useAutoRotate, usePageVisible, usePrefersReducedMotion, useSwipe } from "../hooks-carousel";
import type { BoardSection } from "../types";
import { SlideCard } from "./announcement-card";

/**
 * Một khối loại ở trang chủ bảng tin: tên loại, "Xem tất cả (N)", một thẻ bài và hàng chấm tròn. Các bài của loại tự trượt
 * ngang sau mỗi 10 giây; người dùng đổi tin bằng cách **kéo chuột / vuốt ngón tay** sang trái hoặc phải, bấm chấm tròn, hoặc
 * phím ← → khi đang focus trong khối. Để vẫn dễ dùng:
 *  - tạm dừng khi rê chuột (chỉ chuột), khi đang kéo, khi có focus bằng bàn phím, khi thẻ trình duyệt bị ẩn;
 *  - sau khi người dùng tự điều khiển thì đếm lại đủ một chu kỳ rồi mới tự chuyển tiếp;
 *  - không tự chuyển (và không trượt) khi bật "giảm chuyển động" của hệ điều hành;
 *  - khối chỉ có một bài thì không có chấm, không kéo được và không chuyển.
 * `blockIndex` là vị trí của khối trong lưới, dùng để các khối bắt đầu chuyển lệch nhịp nhau.
 */
export function AnnouncementSection({ section, blockIndex }: { section: BoardSection; blockIndex: number }) {
  const t = useTranslations("Announcements.Board");
  const nameOf = useCategoryName();
  const categoryLabel = nameOf(section.category);
  const items = section.items;
  const count = items.length;

  const [rawIndex, setRawIndex] = useState(0);
  // Danh sách có thể ngắn lại khi dữ liệu được làm mới: luôn kẹp chỉ số trong phạm vi hiện tại
  const index = clampIndex(rawIndex, count);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  const swipe = useSwipe({ count, index, onSwipe: setRawIndex });

  const autoplay = count > 1 && !hovered && !focused && !swipe.dragging && !reducedMotion && pageVisible;
  // `index` làm khóa hẹn lại: mọi lần đổi tin (tự chuyển, kéo, chấm, phím) đều đếm lại đủ một chu kỳ
  useAutoRotate(autoplay, () => setRawIndex((current) => nextIndex(clampIndex(current, count), count)), blockIndex, index);

  function onPointerEnter(event: PointerEvent) {
    // Chạm cũng sinh pointerenter nhưng không có "rời đi": chỉ tính chuột
    if (event.pointerType === "mouse") setHovered(true);
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    // Chỉ focus bằng bàn phím mới tạm dừng: bấm chuột hoặc chạm vào chấm cũng làm nút có focus, nếu tính thì khối sẽ đứng
    // mãi cho tới khi bấm chỗ khác
    if (event.target.matches(":focus-visible")) setFocused(true);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (count <= 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setRawIndex(prevIndex(index, count));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setRawIndex(nextIndex(index, count));
    }
  }

  if (count === 0) return null;

  return (
    <section
      role="group"
      aria-roledescription="carousel"
      aria-label={t("carouselLabel", { name: categoryLabel })}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs"
    >
      <div className="flex items-baseline justify-between gap-3 border-b pb-2">
        <h2 className="text-base font-semibold break-words">{categoryLabel}</h2>
        <Link
          href={`/announcements/all?categoryId=${encodeURIComponent(section.category.id)}`}
          draggable={false}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("seeAll", { count: section.total })}
        </Link>
      </div>

      {/* Khung kéo: vuốt dọc vẫn cuộn trang (touch-pan-y), vuốt / kéo ngang đổi tin */}
      <div
        {...swipe.handlers}
        className={cn(
          "relative touch-pan-y overflow-hidden rounded-lg select-none",
          count > 1 && "cursor-grab active:cursor-grabbing",
        )}
      >
        <div
          // Đang tự chuyển thì không đọc to từng lần đổi tin; đã dừng thì đọc để người dùng biết tin hiện tại
          aria-live={autoplay ? "off" : "polite"}
          // Lúc kéo thì đi theo tay, không có hiệu ứng trượt; buông tay hoặc tự chuyển mới trượt
          className={cn("flex", !reducedMotion && !swipe.dragging && "transition-transform duration-[400ms] ease-out")}
          style={{ transform: dragTransform(index, swipe.dragX) }}
        >
          {items.map((announcement, i) => (
            <div
              key={announcement.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t("slideLabel", { current: i + 1, total: count })}
              // Thẻ đang ẩn không nhận focus bàn phím và không bị đọc
              aria-hidden={i !== index}
              inert={i !== index}
              className="w-full shrink-0"
            >
              <SlideCard announcement={announcement} />
            </div>
          ))}
        </div>
      </div>

      {/* Luôn giữ chiều cao của hàng chấm (kể cả khi chỉ có một bài) để các khối trong lưới cao bằng nhau */}
      <div className="flex h-4 items-center justify-center gap-1.5">
        {count > 1 &&
          items.map((announcement, i) => (
            <button
              key={announcement.id}
              type="button"
              aria-label={t("slideLabel", { current: i + 1, total: count })}
              aria-current={i === index}
              onClick={() => setRawIndex(i)}
              className="grid size-4 place-items-center rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "block rounded-full transition-all motion-reduce:transition-none",
                  i === index ? "size-2 bg-primary" : "size-1.5 bg-muted-foreground/40",
                )}
              />
            </button>
          ))}
      </div>
    </section>
  );
}
