"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime } from "@/lib/format";
import { useApprovalFilters, useApprovalList, useApprovalTypeLabel, useInboxCount, usePersonName } from "../hooks";
import { parseTitle } from "../rules";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  type ApprovalStatus,
  type ApprovalSummary,
  type ApprovalTab,
  type ApprovalType,
} from "../types";
import { ApprovalStatusBadge } from "./approval-status-badge";

/** Giá trị "không lọc" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const ALL = "all";

/** Phê duyệt: chờ tôi duyệt / tôi đã gửi / tất cả (approval:read-all). Tab và bộ lọc nằm trên URL. */
export function ApprovalListPage() {
  const t = useTranslations("Approvals");
  const typeLabel = useApprovalTypeLabel();
  const personName = usePersonName();
  const { filters, setFilters, canReadAll } = useApprovalFilters();
  const tableState = useDataTableState();
  const inboxCount = useInboxCount().data ?? 0;

  // Đổi tab / bộ lọc thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useApprovalList(filters, tableState.pageParams);
  const showRequester = filters.tab !== "mine";

  // Không cho sắp xếp: backend luôn xếp mới gửi trước.
  const columns = useMemo(() => {
    const col = createDataTableColumns<ApprovalSummary>();
    return col.columns([
      col.accessor("title", {
        header: t("Columns.request"),
        cell: (c) => {
          const row = c.row.original;
          const { urgent, text } = parseTitle(row.title);
          return (
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{typeLabel(row.type)}</Badge>
                {urgent && <Badge variant="destructive">{t("List.urgent")}</Badge>}
              </span>
              <Link
                href={`/approvals/${encodeURIComponent(row.id)}`}
                title={text}
                className="max-w-96 truncate font-medium hover:underline focus-visible:underline"
              >
                {text}
              </Link>
            </span>
          );
        },
      }),
      ...(showRequester
        ? [
            col.accessor("requesterName", {
              header: t("Columns.requester"),
              cell: (c) => personName(c.row.original.requesterUserId, c.getValue()),
            }),
          ]
        : []),
      col.accessor("currentStepName", {
        header: t("Columns.step"),
        cell: (c) => {
          const row = c.row.original;
          if (row.status !== "PENDING" || row.currentStepNo === null) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex flex-col">
              <span>{t("List.stepNo", { step: row.currentStepNo })}</span>
              {row.currentStepName && <span className="text-xs text-muted-foreground">{row.currentStepName}</span>}
            </span>
          );
        },
      }),
      col.accessor("status", {
        header: t("Columns.status"),
        cell: (c) => <ApprovalStatusBadge status={c.getValue()} />,
      }),
      col.accessor("submittedAt", {
        header: t("Columns.submittedAt"),
        cell: (c) => (
          <time dateTime={c.getValue()} className="whitespace-nowrap tabular-nums">
            {formatDateTime(c.getValue())}
          </time>
        ),
      }),
    ]);
  }, [t, typeLabel, personName, showRequester]);

  const typeItems: Record<string, string> = {
    [ALL]: t("Filters.allTypes"),
    ...Object.fromEntries(APPROVAL_TYPES.map((type) => [type, typeLabel(type)])),
  };
  const statusItems: Record<string, string> = {
    [ALL]: t("Filters.allStatuses"),
    ...Object.fromEntries(APPROVAL_STATUSES.map((status) => [status, t(`status.${status}`)])),
  };

  function changeTab(tab: ApprovalTab) {
    // Giữ lọc theo loại khi đổi tab; trạng thái không áp dụng cho inbox nên bỏ.
    setFilters({ tab, type: filters.type, status: tab === "inbox" ? undefined : filters.status });
  }

  return (
    <>
      <PageHeader title={t("List.title")} description={t("List.description")} />

      <Tabs value={filters.tab} onValueChange={(value) => changeTab(value as ApprovalTab)}>
        <TabsList>
          <TabsTrigger value="inbox">
            {t("Tabs.inbox")}
            {inboxCount > 0 && (
              <Badge variant="warning" className="ml-1 tabular-nums">
                {inboxCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mine">{t("Tabs.mine")}</TabsTrigger>
          {canReadAll && <TabsTrigger value="all">{t("Tabs.all")}</TabsTrigger>}
        </TabsList>

        <TabsContent value={filters.tab} className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t(`Tabs.${filters.tab}Description`)}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={filters.type ?? ALL}
              onValueChange={(value) =>
                setFilters({ ...filters, type: value === ALL ? undefined : (String(value) as ApprovalType) })
              }
              items={typeItems}
            >
              <SelectTrigger className="w-full bg-card sm:w-56" aria-label={t("Filters.type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.tab !== "inbox" && (
              <Select
                value={filters.status ?? ALL}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === ALL ? undefined : (String(value) as ApprovalStatus) })
                }
                items={statusItems}
              >
                <SelectTrigger className="w-full bg-card sm:w-44" aria-label={t("Filters.status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DataTable
            columns={columns}
            query={query}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title={t(`List.empty.${filters.tab}Title`)}
                description={filters.type || filters.status ? t("List.empty.filtered") : t(`List.empty.${filters.tab}`)}
              />
            }
            {...tableState.bind}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
