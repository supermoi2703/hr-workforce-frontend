"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { ArrowLeftIcon, MegaphoneIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { useAnnouncements, useCategories, useCategoryName } from "../hooks";
import { FeaturedCard } from "./announcement-card";

/**
 * Tất cả bài đã đăng thuộc đối tượng nhận của mình, ghim trước rồi mới nhất trước, có lọc loại, tìm theo tiêu đề và phân
 * trang. Bộ lọc ban đầu đọc từ URL (`?categoryId=&q=`) để "Xem tất cả" của từng khối loại ở trang chủ mở đúng loại.
 */
export function AnnouncementListPage() {
  const t = useTranslations("Announcements");
  const tBoard = useTranslations("Announcements.Board");
  const params = useSearchParams();
  const categories = useCategories();
  const nameOf = useCategoryName();

  /** "" = mọi loại. */
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {query.data.content.map((announcement) => (
            <li key={announcement.id} className="flex">
              <FeaturedCard announcement={announcement} className="w-full" />
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
        title={tBoard("allPosts")}
        description={t("description")}
        actions={
          <Link href="/announcements" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeftIcon />
            {tBoard("backToBoard")}
          </Link>
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
              {nameOf(category)}
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
