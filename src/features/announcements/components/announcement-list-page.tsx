"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PaginationState } from "@tanstack/react-table";
import { MegaphoneIcon, PinIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAnnouncements, useCategories } from "../hooks";
import { AnnouncementAudienceLabel, AnnouncementCategoryBadge } from "./announcement-badges";
import { CoverImage } from "./cover-image";

/** Bảng tin: bài đã đăng thuộc đối tượng nhận của mình, ghim trước rồi mới nhất trước. */
export function AnnouncementListPage() {
  const t = useTranslations("Announcements");
  const { hasPermission } = useCurrentUser();
  const categories = useCategories();

  /** "" = mọi loại. */
  const [categoryId, setCategoryId] = useState("");
  const [keyword, setKeyword] = useState("");
  const q = useDebouncedValue(keyword.trim());
  const filters = useMemo(() => ({ categoryId: categoryId || undefined, q: q || undefined }), [categoryId, q]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (pagination.pageIndex !== 0) setPagination({ ...pagination, pageIndex: 0 });
  }

  const query = useAnnouncements(filters, { page: pagination.pageIndex, size: pagination.pageSize });

  let content;
  if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.content.length === 0) {
    content = (
      <EmptyState
        icon={<MegaphoneIcon />}
        title={filters.categoryId || filters.q ? t("List.emptyFiltered") : t("List.empty")}
        description={filters.categoryId || filters.q ? undefined : t("List.emptyHint")}
        className="border border-dashed"
      />
    );
  } else {
    content = (
      <>
        <ul className="grid gap-3">
          {query.data.content.map((announcement) => (
            <li key={announcement.id}>
              <Link
                href={`/announcements/${announcement.id}`}
                className="block overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <CoverImage src={announcement.coverUrl} className="max-h-56" />
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <PinIcon className="size-3.5" aria-hidden />
                        {t("pinned")}
                      </span>
                    )}
                    <AnnouncementCategoryBadge category={announcement.category} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(announcement.publishedAt)}</span>
                  </div>
                  <h2 className="mt-2 font-semibold break-words">{announcement.title}</h2>
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
            </li>
          ))}
        </ul>
        <DataTablePagination
          page={query.data}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          hasPermission("announcement:manage") && (
            <Link href="/announcements/manage" className={buttonVariants({ variant: "outline" })}>
              <SettingsIcon />
              {t("List.manage")}
            </Link>
          )
        }
      />

      <div className="space-y-3">
        <div className="relative sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("List.searchPlaceholder")}
            aria-label={t("List.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        {/* Bộ lọc theo loại: nhãn theo thứ tự HR đặt, không cố định trong code */}
        <div role="group" aria-label={t("List.categoryFilter")} className="flex flex-wrap gap-2">
          <FilterChip active={categoryId === ""} onClick={() => setCategoryId("")}>
            {t("List.allCategories")}
          </FilterChip>
          {categories.data?.map((category) => (
            <FilterChip
              key={category.id}
              active={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {content}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
