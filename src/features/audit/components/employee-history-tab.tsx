"use client";

import { useMemo, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime } from "@/lib/format";
import { useActionLabel, useEmployeeHistory, useMetadataLabels } from "../hooks";
import { formatChanges, formatHistoryMetadata } from "../metadata";
import { EMPLOYEE_HISTORY_GROUPS, type EmployeeHistoryGroup, type EmployeeHistoryItem } from "../types";

/** Giá trị "mọi nhóm" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const ALL = "all";

type EmployeeHistoryTabProps = {
  employeeId: string;
  /** Tên đơn vị theo id: feature không import nhau nên route truyền vào. */
  unitName: (field: string, id: string) => string | null | undefined;
};

/** Tab Lịch sử của hồ sơ: ai đổi gì, lúc nào, trước và sau là gì. Không cho sắp xếp: backend luôn xếp mới nhất trước. */
export function EmployeeHistoryTab({ employeeId, unitName }: EmployeeHistoryTabProps) {
  const t = useTranslations("AuditLog");
  const actionLabel = useActionLabel();
  const labels = useMetadataLabels();
  const tableState = useDataTableState();
  const [group, setGroup] = useState<EmployeeHistoryGroup | undefined>(undefined);
  const query = useEmployeeHistory(employeeId, group, tableState.pageParams);

  const columns = useMemo(() => {
    const col = createDataTableColumns<EmployeeHistoryItem>();
    return col.columns([
      col.accessor("createdAt", {
        header: t("Columns.time"),
        cell: (c) => <time dateTime={c.getValue()} className="whitespace-nowrap">{formatDateTime(c.getValue())}</time>,
      }),
      col.accessor("action", {
        header: t("Columns.action"),
        cell: (c) => (
          <span className="flex flex-col">
            <span>{actionLabel(c.getValue())}</span>
            <span className="text-xs text-muted-foreground">{c.row.original.targetLabel}</span>
          </span>
        ),
      }),
      col.accessor("actorEmail", {
        header: t("Columns.actor"),
        cell: (c) => c.getValue() ?? <span className="text-muted-foreground">{t("List.system")}</span>,
      }),
      col.accessor("metadata", {
        header: t("Sheet.details"),
        cell: (c) => {
          const changes = formatChanges(c.getValue()?.changes, labels, unitName);
          const rows = formatHistoryMetadata(c.getValue(), labels);
          if (changes.length === 0 && rows.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex min-w-48 flex-col gap-1 text-sm whitespace-normal">
              {changes.map((change) => (
                <p key={change.key} className="flex flex-wrap items-center gap-1 break-all">
                  <span className="text-muted-foreground">{change.label}:</span>
                  <span>{change.before}</span>
                  <ArrowRightIcon aria-label={t("History.changedTo")} className="size-3 shrink-0" />
                  <span>{change.after}</span>
                </p>
              ))}
              {rows.map((row) => (
                <p key={row.key} className="break-all">
                  <span className="text-muted-foreground">{row.label}:</span> {row.value}
                </p>
              ))}
            </div>
          );
        },
      }),
    ]);
  }, [t, actionLabel, labels, unitName]);

  const groupItems: Record<string, string> = {
    [ALL]: t("History.allGroups"),
    ...Object.fromEntries(EMPLOYEE_HISTORY_GROUPS.map((value) => [value, t(`History.groups.${value}`)])),
  };

  // Đổi nhóm thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  function changeGroup(value: string | null) {
    setGroup(value === null || value === ALL ? undefined : (value as EmployeeHistoryGroup));
    tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
  }

  return (
    <div className="flex flex-col gap-3">
      <Select value={group ?? ALL} onValueChange={changeGroup} items={groupItems}>
        <SelectTrigger className="w-full bg-card sm:w-56" aria-label={t("History.group")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DataTable
        columns={columns}
        query={query}
        getRowId={(row) => row.id}
        pagination={tableState.pagination}
        onPaginationChange={tableState.bind.onPaginationChange}
        empty={<EmptyState title={t("History.empty")} />}
      />
    </div>
  );
}
