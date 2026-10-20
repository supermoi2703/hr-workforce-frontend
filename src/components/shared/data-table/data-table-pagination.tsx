"use client";

import type { OnChangeFn, PaginationState } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PageResponse } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

type DataTablePaginationProps = {
  page: PageResponse<unknown>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageSizeOptions?: number[];
};

export function DataTablePagination({
  page,
  pagination,
  onPaginationChange,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  const t = useTranslations("DataTable");
  const { pageIndex, pageSize } = pagination;
  const lastPage = Math.max(page.totalPages - 1, 0);
  const from = page.totalElements === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, page.totalElements);
  const goTo = (index: number) => onPaginationChange({ pageIndex: Math.min(Math.max(index, 0), lastPage), pageSize });

  return (
    <div className="flex flex-col-reverse gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        {t("summary", { from: formatNumber(from), to: formatNumber(to), total: formatNumber(page.totalElements) })}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">{t("rows")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPaginationChange({ pageIndex: 0, pageSize: Number(value) })}
          >
            <SelectTrigger size="sm" className="w-18" aria-label={t("rowsPerPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="whitespace-nowrap">
          {t("pageOf", { page: pageIndex + 1, pages: Math.max(page.totalPages, 1) })}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => goTo(0)} disabled={pageIndex === 0} aria-label={t("firstPage")}>
            <ChevronsLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(pageIndex - 1)} disabled={pageIndex === 0} aria-label={t("previousPage")}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(pageIndex + 1)} disabled={pageIndex >= lastPage} aria-label={t("nextPage")}>
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(lastPage)} disabled={pageIndex >= lastPage} aria-label={t("lastPage")}>
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
