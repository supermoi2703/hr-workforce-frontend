"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCategoryName } from "../hooks";
import { isScrolledToEnd, isScrolledToStart } from "../rules";
import type { AnnouncementItem } from "../types";

/**
 * Cột "Tin nhanh": bài ghim trước rồi mới nhất, mọi loại, dạng chữ (loại · ngày giờ, tiêu đề, hai dòng đầu, "Đọc thêm").
 * Bài ghim có icon ghim. Cuộn trong khung cao cố định với thanh cuộn mảnh và lớp mờ ở đầu / đáy khung báo còn tin phía
 * trên / phía dưới (mỗi lớp tự ẩn khi đã cuộn tới mép).
 */
export function QuickNews({ items }: { items: AnnouncementItem[] }) {
  const t = useTranslations("Announcements.Board");
  const tPinned = useTranslations("Announcements");
  const nameOf = useCategoryName();
  const listRef = useRef<HTMLUListElement>(null);
  // Chưa đo thì coi như không có gì để cuộn: không hiện lớp mờ nào cho tới khi biết chắc
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  // Đo lại khi cuộn và khi khung đổi kích thước (ResizeObserver cũng gọi một lần ngay sau khi gắn, và khi danh sách đổi)
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () =>
      setEdges((previous) => {
        const next = {
          atStart: isScrolledToStart(list.scrollTop),
          atEnd: isScrolledToEnd(list.scrollTop, list.clientHeight, list.scrollHeight),
        };
        // Cuộn bắn sự kiện liên tục: chỉ cập nhật khi thật sự đổi để không render thừa
        return previous.atStart === next.atStart && previous.atEnd === next.atEnd ? previous : next;
      });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", measure);
    };
  }, [items]);

  if (items.length === 0) return null;

  const fade = "pointer-events-none absolute inset-x-0 h-10 transition-opacity duration-200 motion-reduce:transition-none";

  return (
    <aside aria-labelledby="board-quick-news" className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h2 id="board-quick-news" className="text-base font-semibold">
          {t("quickNews")}
        </h2>
        <Link
          href="/announcements/all"
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="relative">
        <ul
          ref={listRef}
          className={cn(
            "max-h-[32rem] divide-y overflow-y-auto overscroll-contain",
            // Thanh cuộn mảnh, màu xám dịu hợp cả nền sáng và tối, không có nền; chừa sẵn chỗ để nội dung không xô khi nó hiện
            "[scrollbar-color:color-mix(in_oklab,var(--muted-foreground)_35%,transparent)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]",
            // Trình duyệt cũ chưa hiểu các thuộc tính trên
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent",
          )}
        >
          {items.map((announcement) => (
            <li key={announcement.id}>
              <Link
                href={`/announcements/${announcement.id}`}
                className="group block space-y-1 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {announcement.pinned && (
                    <>
                      <PinIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="sr-only">{tPinned("pinned")}</span>
                    </>
                  )}
                  <span>{nameOf(announcement.category)}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDateTime(announcement.publishedAt)}</span>
                </div>
                <p className="text-sm font-medium break-words transition-colors group-hover:text-primary motion-reduce:transition-none">
                  {announcement.title}
                </p>
                <p className="line-clamp-2 text-sm break-words text-muted-foreground">{announcement.excerpt}</p>
                <span className="inline-block text-xs text-primary group-hover:underline group-hover:underline-offset-4">
                  {t("readMore")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Lớp mờ: còn tin phía trên / phía dưới thì hiện, cuộn tới mép thì ẩn */}
        <div
          aria-hidden
          className={cn(fade, "top-0 bg-gradient-to-b from-card to-transparent", edges.atStart ? "opacity-0" : "opacity-100")}
        />
        <div
          aria-hidden
          className={cn(fade, "bottom-0 bg-gradient-to-t from-card to-transparent", edges.atEnd ? "opacity-0" : "opacity-100")}
        />
      </div>
    </aside>
  );
}
