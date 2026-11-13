"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnnouncementItem } from "../types";
import { AnnouncementAudienceLabel, AnnouncementCategoryBadge } from "./announcement-badges";
import { CoverImage } from "./cover-image";

// Hiệu ứng chung của thẻ, đều tắt khi bật "giảm chuyển động": nâng nhẹ 2 px và đậm bóng khi rê chuột; tiêu đề đổi màu
// và gạch chân mảnh (nhóm `group` để cả ảnh bên trong cũng phản ứng, xem CoverImage).
const LIFT =
  "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const FOCUS = "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
const TITLE_HOVER = "transition-colors group-hover:text-primary group-hover:underline group-hover:underline-offset-4";

/** Nhãn "Đã ghim" (chữ, không icon trang trí). */
export function PinnedLabel() {
  const t = useTranslations("Announcements");
  return <span className="text-xs font-medium text-primary">{t("pinned")}</span>;
}

/**
 * Thẻ nổi bật: ảnh bìa lớn (nếu có) rồi loại, ngày, tiêu đề, đoạn đầu và đối tượng nhận. Bài không có ảnh bìa thì chỉ có
 * chữ, không chèn ảnh giả. Dùng ở khối loại của trang chủ bảng tin và ở danh sách đầy đủ.
 */
export function FeaturedCard({ announcement, className }: { announcement: AnnouncementItem; className?: string }) {
  const t = useTranslations("Announcements");
  return (
    <Link
      href={`/announcements/${announcement.id}`}
      className={cn("group block overflow-hidden rounded-xl border bg-card shadow-xs", LIFT, FOCUS, className)}
    >
      <CoverImage src={announcement.coverUrl} />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.pinned && <PinnedLabel />}
          <AnnouncementCategoryBadge category={announcement.category} />
          <span className="text-xs text-muted-foreground">{formatDateTime(announcement.publishedAt)}</span>
        </div>
        <h3 className={cn("mt-2 text-base font-semibold break-words", TITLE_HOVER)}>{announcement.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm break-words text-muted-foreground">{announcement.excerpt}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <AnnouncementAudienceLabel
            audienceType={announcement.audienceType}
            audienceName={announcement.audienceName}
          />
          {announcement.publishedByName && <> · {t("publishedBy", { name: announcement.publishedByName })}</>}
        </p>
      </div>
    </Link>
  );
}

/**
 * Hàng gọn: ảnh vuông nhỏ (nếu có), tiêu đề tối đa hai dòng và ngày. Dùng cho các bài phụ trong khối loại, "Tin mới nhất"
 * và "Cùng loại" ở trang chi tiết.
 */
export function CompactRow({ announcement, className }: { announcement: AnnouncementItem; className?: string }) {
  return (
    <Link
      href={`/announcements/${announcement.id}`}
      className={cn("group flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50", FOCUS, className)}
    >
      <CoverImage src={announcement.coverUrl} className="aspect-square w-16 shrink-0 rounded-md sm:w-20" />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-sm font-medium break-words", TITLE_HOVER)}>
          {announcement.pinned && <PinnedLabelInline />}
          {announcement.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(announcement.publishedAt)}</p>
      </div>
    </Link>
  );
}

/**
 * Thẻ trong khối tự chuyển tin ở trang chủ: ảnh bìa 16:9 (hoặc đoạn đầu của bài khi không có ảnh), tiêu đề tối đa hai dòng
 * và ngày. Chiều cao cố định (vùng ảnh 16:9, tiêu đề dành sẵn hai dòng) nên khối không nhảy hình khi đổi tin và các khối
 * trong lưới cao bằng nhau.
 */
export function SlideCard({ announcement }: { announcement: AnnouncementItem }) {
  return (
    <Link
      href={`/announcements/${announcement.id}`}
      // Liên kết kéo thả được theo mặc định, sẽ tranh với cử chỉ kéo đổi tin của khối
      draggable={false}
      className={cn("group block overflow-hidden rounded-lg border bg-card", FOCUS)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {announcement.coverUrl ? (
          <CoverImage src={announcement.coverUrl} className="absolute inset-0 aspect-auto h-full" />
        ) : (
          // Không có ảnh bìa: hiện đoạn đầu của bài thay vì ảnh giả, để mọi thẻ cao bằng nhau
          <p className="line-clamp-5 p-4 text-sm break-words text-muted-foreground">{announcement.excerpt}</p>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className={cn("line-clamp-2 min-h-12 text-base leading-6 font-semibold break-words", TITLE_HOVER)}>
          {announcement.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {announcement.pinned && <PinnedLabel />}
          <span>{formatDateTime(announcement.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

/** "Đã ghim ·" nằm cùng dòng với tiêu đề của hàng gọn. */
function PinnedLabelInline() {
  const t = useTranslations("Announcements");
  return <span className="mr-1 text-xs font-medium text-primary">{t("pinned")} ·</span>;
}
