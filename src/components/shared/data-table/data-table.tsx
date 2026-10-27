"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import type { PageParams, PageResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState } from "../states";
import { DataTablePagination } from "./data-table-pagination";

/** Bảng chỉ dùng phân trang + sắp xếp phía server (backend trả PageResponse). */
export const dataTableFeatures = tableFeatures({ rowPaginationFeature, rowSortingFeature });

type Features = typeof dataTableFeatures;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- giá trị từng cột khác kiểu nhau
export type DataTableColumn<TData extends RowData> = ColumnDef<Features, TData, any>;

/**
 * Tạo helper khai báo cột có kiểu. Khai báo cột ở ngoài component (hoặc trong useMemo) để
 * bảng không phải tính lại mỗi lần render:
 *
 *   const col = createDataTableColumns<Employee>();
 *   const columns = col.columns([
 *     col.accessor("fullName", { header: "Họ tên" }),
 *     col.accessor("joinedAt", { header: "Ngày vào", cell: (c) => formatDate(c.getValue()) }),
 *   ]);
 */
export function createDataTableColumns<TData extends RowData>() {
  return createColumnHelper<Features, TData>();
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Trạng thái phân trang/sắp xếp của bảng, kèm `pageParams` để đưa vào queryKey và gọi API:
 *
 *   const tableState = useDataTableState();
 *   const query = useQuery({
 *     queryKey: ["employees", tableState.pageParams],
 *     queryFn: () => http.get<PageResponse<Employee>>("/api/employees", { query: toPageQuery(tableState.pageParams) }),
 *     placeholderData: keepPreviousData,
 *   });
 *   <DataTable columns={columns} query={query} {...tableState.bind} />
 */
export function useDataTableState(initial?: { pageSize?: number; sorting?: SortingState }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initial?.pageSize ?? DEFAULT_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>(initial?.sorting ?? []);

  // Đổi sắp xếp thì quay về trang đầu.
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const pageParams = useMemo<PageParams>(
    () => ({
      page: pagination.pageIndex,
      size: pagination.pageSize,
      sort: sorting.map((s) => `${s.id},${s.desc ? "desc" : "asc"}`),
    }),
    [pagination, sorting],
  );

  return {
    pagination,
    sorting,
    pageParams,
    /** Truyền thẳng vào <DataTable {...bind} />. */
    bind: {
      pagination,
      onPaginationChange: setPagination,
      sorting,
      onSortingChange: handleSortingChange,
    },
  };
}

/** Phần kết quả của useQuery mà bảng cần. */
type QueryLike<TData extends RowData> = {
  data: PageResponse<TData> | undefined;
  error: unknown;
  isPending: boolean;
  isFetching: boolean;
  refetch: () => unknown;
};

type DataTableProps<TData extends RowData> = {
  /** Phải ổn định giữa các lần render (khai báo ngoài component hoặc dùng useMemo). */
  columns: DataTableColumn<TData>[];
  query: QueryLike<TData>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  getRowId?: (row: TData) => string;
  /** Nội dung khi không có dòng nào. */
  empty?: ReactNode;
  pageSizeOptions?: number[];
  className?: string;
};

const EMPTY_ROWS: never[] = [];

export function DataTable<TData extends RowData>({
  columns,
  query,
  pagination,
  onPaginationChange,
  sorting = [],
  onSortingChange,
  getRowId,
  empty,
  pageSizeOptions,
  className,
}: DataTableProps<TData>) {
  const t = useTranslations("States");
  const page = query.data;
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: page?.content ?? (EMPTY_ROWS as TData[]),
    rowCount: page?.totalElements ?? 0,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    manualPagination: true,
    manualSorting: true,
    enableSorting: !!onSortingChange,
  });

  if (query.error && !page) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} className={className} />;
  }

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> {t("loading")}
                  </span>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount}>{empty ?? <EmptyState />}</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {query.isFetching && !query.isPending && (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary" aria-hidden />
        )}
      </div>
      {page && page.totalElements > 0 && (
        <DataTablePagination
          page={page}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
