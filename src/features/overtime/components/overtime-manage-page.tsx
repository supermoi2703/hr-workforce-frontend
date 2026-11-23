"use client";

import { useMemo, useState } from "react";
import { MoonIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, todayIsoDate } from "@/lib/format";
import { useDuration, useOffices, useOvertimeList } from "../hooks";
import { isSettled, isValidMonth } from "../rules";
import { OVERTIME_STATUSES, type OvertimeRequest, type OvertimeStatus } from "../types";
import { OvertimeKindBadge, OvertimeStatusBadge } from "./overtime-badges";
import { useWindowLabel } from "./overtime-list";

/** Báo cáo làm thêm giờ cho HR (overtime:read): lọc theo tháng, văn phòng, trạng thái; phân trang phía server. */
export function OvertimeManagePage() {
  const t = useTranslations("Overtime.manage");
  const tStatus = useTranslations("Overtime.statuses");
  const [monthInput, setMonthInput] = useState(todayIsoDate().slice(0, 7));
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("");
  const tableState = useDataTableState();
  const offices = useOffices();
  const month = isValidMonth(monthInput) ? monthInput : null;
  const filters = { month: month ?? "", officeId: officeId || undefined, status: (status || undefined) as OvertimeStatus | undefined };
  const query = useOvertimeList(filters, { page: tableState.pageParams.page, size: tableState.pageParams.size });
  const columns = useColumns();

  function changeFilter(update: () => void) {
    update();
    if (tableState.pagination.pageIndex !== 0) tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Input
              type="month"
              className="w-40"
              value={monthInput}
              aria-label={t("month")}
              onChange={(e) => changeFilter(() => setMonthInput(e.target.value))}
            />
            <div className="w-48">
              <ChoiceSelect
                value={officeId}
                onChange={(value) => changeFilter(() => setOfficeId(value))}
                noneLabel={t("allOffices")}
                choices={(offices.data ?? []).map((office) => ({ value: office.id, label: office.name }))}
                ariaLabel={t("office")}
              />
            </div>
            <div className="w-48">
              <ChoiceSelect
                value={status}
                onChange={(value) => changeFilter(() => setStatus(value))}
                noneLabel={t("allStatuses")}
                choices={OVERTIME_STATUSES.map((value) => ({ value, label: tStatus(value) }))}
                ariaLabel={t("status")}
              />
            </div>
          </>
        }
      />
      {month ? (
        <DataTable
          columns={columns}
          query={query}
          {...tableState.bind}
          sorting={undefined}
          onSortingChange={undefined}
          getRowId={(row) => row.id}
          empty={<EmptyState title={t("empty")} />}
        />
      ) : (
        <EmptyState title={t("pickMonth")} />
      )}
    </div>
  );
}

function useColumns() {
  const t = useTranslations("Overtime.manage");
  const tList = useTranslations("Overtime.list");
  const duration = useDuration();
  const windowLabel = useWindowLabel();

  return useMemo(() => {
    const col = createDataTableColumns<OvertimeRequest>();
    const hideOnPhone = { className: "hidden md:table-cell" };
    return col.columns([
      col.display({
        id: "employee",
        header: t("employee"),
        cell: (c) => {
          const item = c.row.original;
          const window = windowLabel(item);
          return (
            <span className="block min-w-0">
              <span className="block font-medium">{item.employeeName}</span>
              {/* Điện thoại: cột ngày, task ẩn đi nên ghép vào đây. */}
              <span className="block text-xs text-muted-foreground tabular-nums md:hidden">
                {formatDate(item.workDate)} {window.range}
                {item.taskKey && ` · ${item.taskKey}`}
              </span>
            </span>
          );
        },
      }),
      col.display({
        id: "when",
        header: t("when"),
        meta: hideOnPhone,
        cell: (c) => {
          const window = windowLabel(c.row.original);
          return (
            <span className="tabular-nums">
              {formatDate(c.row.original.workDate)} {window.range}
              {window.nextDay && <span className="block text-xs text-muted-foreground">{window.nextDay}</span>}
            </span>
          );
        },
      }),
      col.display({
        id: "task",
        header: t("task"),
        meta: hideOnPhone,
        cell: (c) => {
          const item = c.row.original;
          return (
            <span className="block max-w-64 min-w-0">
              {item.taskKey ? (
                <span className="block truncate">
                  <span className="font-mono text-xs text-muted-foreground">{item.taskKey}</span> {item.taskTitle}
                </span>
              ) : (
                <span className="text-muted-foreground">{tList("noTask")}</span>
              )}
              {item.projectName && <span className="block truncate text-xs text-muted-foreground">{item.projectName}</span>}
            </span>
          );
        },
      }),
      col.display({
        id: "kind",
        header: t("kind"),
        meta: hideOnPhone,
        cell: (c) => <OvertimeKindBadge kind={c.row.original.kind} />,
      }),
      col.display({
        id: "status",
        header: t("status"),
        cell: (c) => (
          <span className="flex flex-wrap gap-1">
            <OvertimeStatusBadge status={c.row.original.status} />
            {c.row.original.pendingHrDecision && <Badge variant="warning">{tList("pendingHr")}</Badge>}
          </span>
        ),
      }),
      col.display({
        id: "planned",
        header: t("planned"),
        meta: hideOnPhone,
        cell: (c) => <span className="tabular-nums">{duration(c.row.original.plannedMinutes)}</span>,
      }),
      col.display({
        id: "paid",
        header: t("paid"),
        cell: (c) => {
          const item = c.row.original;
          if (!isSettled(item)) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block tabular-nums">
              {duration(item.paidMinutesNormal ?? 0)}
              {(item.paidMinutesNight ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MoonIcon className="size-3" aria-label={t("night")} /> {duration(item.paidMinutesNight)}
                </span>
              )}
            </span>
          );
        },
      }),
    ]);
  }, [t, tList, duration, windowLabel]);
}
