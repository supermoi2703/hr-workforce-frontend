"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/format";
import type { AnnouncementItem } from "../types";
import { PinnedLabel } from "./announcement-card";

/**
 * Cột "Tin nhanh": bài ghim trước rồi mới nhất, mọi loại, dạng chữ (tiêu đề, hai dòng đầu, "Đọc thêm"), cuộn trong khung
 * cao cố định để cột không dài hơn các khối bên cạnh.
 */
export function QuickNews({ items }: { items: AnnouncementItem[] }) {
  const t = useTranslations("Announcements.Board");
  if (items.length === 0) return null;

  return (
    <aside aria-labelledby="board-quick-news" className="rounded-xl border bg-card shadow-xs">
      <h2 id="board-quick-news" className="border-b px-4 py-3 text-base font-semibold">
        {t("quickNews")}
      </h2>
      <ul className="max-h-[32rem] divide-y overflow-y-auto">
        {items.map((announcement) => (
          <li key={announcement.id}>
            <Link
              href={`/announcements/${announcement.id}`}
              className="group block space-y-1 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {announcement.pinned && <PinnedLabel />}
                <span>{formatDateTime(announcement.publishedAt)}</span>
              </div>
              <p className="text-sm font-medium break-words transition-colors group-hover:text-primary">
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
    </aside>
  );
}
