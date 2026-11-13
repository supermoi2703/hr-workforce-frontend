"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncementBoard } from "../hooks";
import type { AnnouncementItem } from "../types";
import { CompactRow } from "./announcement-card";

const LATEST_LIMIT = 6;
const SAME_CATEGORY_LIMIT = 3;

/**
 * Cột phải của trang chi tiết: "Tin mới nhất" và "Cùng loại", bỏ bài đang xem. Không có API riêng: lấy từ chính dữ liệu của
 * trang chủ bảng tin (`board`), nên vào bài từ trang chủ thì đã có sẵn trong bộ nhớ đệm. Phần phụ nên lỗi thì ẩn, không
 * làm hỏng trang đọc bài.
 */
export function RelatedNews({ currentId, categoryId }: { currentId: string; categoryId: string }) {
  const t = useTranslations("Announcements.Board");
  const board = useAnnouncementBoard();

  if (board.isPending) {
    return (
      <div className="space-y-3 rounded-xl border p-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }
  if (board.isError) return null;

  const others = (items: AnnouncementItem[]) => items.filter((announcement) => announcement.id !== currentId);
  const latest = others(board.data.quickNews).slice(0, LATEST_LIMIT);
  const section = board.data.sections.find((candidate) => candidate.category.id === categoryId);
  const sameCategory = section ? others(section.items).slice(0, SAME_CATEGORY_LIMIT) : [];

  return (
    <div className="space-y-6">
      {latest.length > 0 && (
        <RelatedBlock title={t("latest")} href="/announcements/all" linkLabel={t("seeMore")}>
          {latest}
        </RelatedBlock>
      )}
      {sameCategory.length > 0 && section && (
        <RelatedBlock
          title={t("sameCategory")}
          href={`/announcements/all?categoryId=${encodeURIComponent(categoryId)}`}
          linkLabel={t("seeAll", { count: section.total })}
        >
          {sameCategory}
        </RelatedBlock>
      )}
    </div>
  );
}

function RelatedBlock({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: AnnouncementItem[];
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <Link
          href={href}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {linkLabel}
        </Link>
      </div>
      <ul className="mt-2 space-y-1">
        {children.map((announcement) => (
          <li key={announcement.id}>
            <CompactRow announcement={announcement} />
          </li>
        ))}
      </ul>
    </section>
  );
}
