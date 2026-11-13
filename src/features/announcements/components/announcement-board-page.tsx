"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MegaphoneIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { useAnnouncementBoard } from "../hooks";
import { AnnouncementSection } from "./announcement-section";
import { QuickNews } from "./quick-news";

/**
 * Trang chủ bảng tin: mỗi loại đang dùng có bài là một khối (một bài nổi bật và vài bài phụ), cột "Tin nhanh" bên phải
 * (xuống đầu trang trên điện thoại). Tìm kiếm và lọc đầy đủ ở /announcements/all.
 */
export function AnnouncementBoardPage() {
  const t = useTranslations("Announcements");
  const tBoard = useTranslations("Announcements.Board");
  const { hasPermission } = useCurrentUser();
  const router = useRouter();
  const query = useAnnouncementBoard();
  const [keyword, setKeyword] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    const q = keyword.trim();
    router.push(q ? `/announcements/all?q=${encodeURIComponent(q)}` : "/announcements/all");
  }

  let content;
  if (query.isPending) {
    content = <BoardSkeleton />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.quickNews.length === 0 && query.data.sections.length === 0) {
    content = (
      <EmptyState
        icon={<MegaphoneIcon />}
        title={t("List.empty")}
        description={t("List.emptyHint")}
        className="border border-dashed"
      />
    );
  } else {
    content = (
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Điện thoại: tin nhanh lên đầu; màn hình rộng: cột phải, dính khi cuộn */}
        <div className="order-first lg:order-last lg:col-span-4">
          <div className="lg:sticky lg:top-4">
            <QuickNews items={query.data.quickNews} />
          </div>
        </div>
        <div className="space-y-8 lg:col-span-8">
          {query.data.sections.map((section) => (
            <AnnouncementSection key={section.category.id} section={section} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <form onSubmit={search} role="search" className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t("List.searchPlaceholder")}
                aria-label={t("List.searchPlaceholder")}
                className="w-56 pl-8"
              />
            </form>
            <Link href="/announcements/all" className={buttonVariants({ variant: "outline" })}>
              {tBoard("allPosts")}
            </Link>
            {hasPermission("announcement:manage") && (
              <Link href="/announcements/manage" className={buttonVariants({ variant: "outline" })}>
                <SettingsIcon />
                {t("List.manage")}
              </Link>
            )}
          </>
        }
      />
      {content}
    </div>
  );
}

/** Khung xương giống bố cục thật để trang không nhảy khi dữ liệu về. */
function BoardSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12" aria-busy="true">
      <div className="order-first space-y-3 rounded-xl border p-4 lg:order-last lg:col-span-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
      <div className="space-y-8 lg:col-span-8">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-4 md:grid-cols-5">
              <Skeleton className="aspect-4/3 md:col-span-3" />
              <div className="space-y-3 md:col-span-2">
                {Array.from({ length: 3 }, (_, j) => (
                  <Skeleton key={j} className="h-14" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
