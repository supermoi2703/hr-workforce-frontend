"use client";

import Link from "next/link";
import { ArrowLeftIcon, PinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { formatDateTime } from "@/lib/format";
import { useAnnouncement } from "../hooks";
import { AnnouncementAudienceLabel, AnnouncementCategoryBadge } from "./announcement-badges";
import { CoverImage } from "./cover-image";
import { MarkdownContent } from "./markdown-content";

/** Một bài đã đăng. Bài ngoài đối tượng nhận, nháp hoặc đã gỡ là 404 (backend không lộ là có bài). */
export function AnnouncementDetailPage({ id }: { id: string }) {
  const t = useTranslations("Announcements");
  const query = useAnnouncement(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {t("Detail.back")}
      </Link>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <article className="overflow-hidden rounded-xl border bg-card">
          <CoverImage src={query.data.coverUrl} />
          <div className="space-y-5 p-5 sm:p-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {query.data.pinned && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <PinIcon className="size-3.5" aria-hidden />
                  {t("pinned")}
                </span>
              )}
              <AnnouncementCategoryBadge category={query.data.category} />
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">{query.data.title}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(query.data.publishedAt)}
              {query.data.publishedByName && <> · {t("publishedBy", { name: query.data.publishedByName })}</>}
              {" · "}
              <AnnouncementAudienceLabel
                audienceType={query.data.audienceType}
                audienceName={query.data.audienceName}
              />
            </p>
          </header>
          <MarkdownContent>{query.data.content}</MarkdownContent>
          </div>
        </article>
      )}
    </div>
  );
}
