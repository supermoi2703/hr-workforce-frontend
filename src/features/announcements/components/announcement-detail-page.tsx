"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAnnouncement, useCategoryName } from "../hooks";
import type { AnnouncementDetail } from "../types";
import { AnnouncementAudienceLabel, AnnouncementCategoryBadge } from "./announcement-badges";
import { PinnedLabel } from "./announcement-card";
import { CoverImage } from "./cover-image";
import { MarkdownContent } from "./markdown-content";
import { RelatedNews } from "./related-news";

/**
 * Một bài đã đăng. Bài có ảnh bìa: ảnh lớn ở đầu trang, tiêu đề đè lên trên lớp tối chuyển sắc để chữ trắng đọc được. Bài
 * không có ảnh bìa: tiêu đề dạng chữ thường (không chèn ảnh giả). Cột phải là "Tin mới nhất" và "Cùng loại".
 * Bài ngoài đối tượng nhận, nháp hoặc đã gỡ là 404 (backend không lộ là có bài).
 */
export function AnnouncementDetailPage({ id }: { id: string }) {
  const query = useAnnouncement(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }
  const announcement = query.data;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <article className="min-w-0 space-y-6 lg:col-span-8">
        {announcement.coverUrl ? <Hero announcement={announcement} /> : <PlainHeader announcement={announcement} />}
        <MarkdownContent className="text-base leading-7">{announcement.content}</MarkdownContent>
      </article>
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-4">
          <RelatedNews currentId={announcement.id} categoryId={announcement.category.id} />
        </div>
      </div>
    </div>
  );
}

/** Ảnh bìa lớn, tiêu đề đè lên góc dưới trái. Nền tối phía sau để chữ vẫn đọc được nếu ảnh không tải được. */
function Hero({ announcement }: { announcement: AnnouncementDetail }) {
  return (
    <header className="relative aspect-video min-h-64 w-full overflow-hidden rounded-xl bg-neutral-900 text-white">
      <CoverImage src={announcement.coverUrl} className="absolute inset-0 aspect-auto h-full" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-24 sm:p-6 sm:pt-32">
        <Crumbs announcement={announcement} onImage />
        <h1 className="font-heading text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {announcement.title}
        </h1>
        <Meta announcement={announcement} className="text-white/80" />
      </div>
    </header>
  );
}

function PlainHeader({ announcement }: { announcement: AnnouncementDetail }) {
  return (
    <header className="space-y-3 border-b pb-6">
      <Crumbs announcement={announcement} />
      <div className="flex flex-wrap items-center gap-2">
        {announcement.pinned && <PinnedLabel />}
        <AnnouncementCategoryBadge category={announcement.category} />
      </div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight break-words sm:text-3xl">{announcement.title}</h1>
      <Meta announcement={announcement} className="text-muted-foreground" />
    </header>
  );
}

/** "Bảng tin › Tên loại": cả hai là liên kết (loại mở danh sách lọc theo loại). */
function Crumbs({ announcement, onImage = false }: { announcement: AnnouncementDetail; onImage?: boolean }) {
  const t = useTranslations("Announcements.Board");
  const nameOf = useCategoryName();
  const link = cn(
    "hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    onImage ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground",
  );
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
      <Link href="/announcements" className={link}>
        {t("breadcrumbRoot")}
      </Link>
      <ChevronRightIcon className={cn("size-3.5", onImage ? "text-white/60" : "text-muted-foreground")} aria-hidden />
      <Link href={`/announcements/all?categoryId=${encodeURIComponent(announcement.category.id)}`} className={link}>
        {nameOf(announcement.category)}
      </Link>
    </nav>
  );
}

function Meta({ announcement, className }: { announcement: AnnouncementDetail; className?: string }) {
  const t = useTranslations("Announcements");
  return (
    <p className={cn("text-sm", className)}>
      {formatDateTime(announcement.publishedAt)}
      {announcement.publishedByName && <> · {t("publishedBy", { name: announcement.publishedByName })}</>}
      {" · "}
      <AnnouncementAudienceLabel audienceType={announcement.audienceType} audienceName={announcement.audienceName} />
    </p>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12" aria-busy="true">
      <div className="space-y-6 lg:col-span-8">
        <Skeleton className="aspect-video min-h-64 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
      <div className="space-y-3 lg:col-span-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
