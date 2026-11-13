"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BoardSection } from "../types";
import { CompactRow, FeaturedCard } from "./announcement-card";

/**
 * Một khối loại ở trang chủ bảng tin: tên loại và "Xem tất cả (N)", rồi một bài nổi bật (ảnh lớn) cùng các bài phụ dạng
 * hàng gọn. Bài đầu của khối là bài nổi bật (ghim trước rồi mới nhất trước, do backend sắp xếp).
 */
export function AnnouncementSection({ section }: { section: BoardSection }) {
  const t = useTranslations("Announcements.Board");
  const [featured, ...rest] = section.items;
  if (!featured) return null;

  return (
    <section aria-labelledby={`board-section-${section.category.id}`} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2">
        <h2 id={`board-section-${section.category.id}`} className="text-base font-semibold break-words">
          {section.category.name}
        </h2>
        <Link
          href={`/announcements/all?categoryId=${encodeURIComponent(section.category.id)}`}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("seeAll", { count: section.total })}
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <FeaturedCard announcement={featured} className={rest.length > 0 ? "md:col-span-3" : "md:col-span-5"} />
        {rest.length > 0 && (
          <div className="md:col-span-2">
            <ul className="space-y-1">
              {rest.map((announcement) => (
                <li key={announcement.id}>
                  <CompactRow announcement={announcement} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
