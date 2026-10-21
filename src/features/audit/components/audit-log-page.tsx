"use client";

import { useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime } from "@/lib/format";
import { hasActiveFilters } from "../filters";
import { useActionLabel, useAuditFilters, useAuditLogs } from "../hooks";
import {
  AUDIT_ACTIONS_BY_CATEGORY,
  AUDIT_OUTCOMES,
  type AuditAction,
  type AuditCategory,
  type AuditLogEntry,
  type AuditOutcome,
} from "../types";
import { AuditLogSheet } from "./audit-log-sheet";
import { DateRangeFilter } from "./date-range-filter";

/** Giá trị "không lọc" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const ALL = "all";
const linkButtonClass = "max-w-full truncate text-left hover:underline focus-visible:underline outline-none";

/** Nhật ký hệ thống: lọc theo hành động / kết quả / khoảng ngày / người (bộ lọc trên URL), xem chi tiết bằng Sheet. */
export function AuditLogPage() {
  const t = useTranslations("AuditLog");
  const actionLabel = useActionLabel();
  const { filters, setFilters, updateFilters } = useAuditFilters();
  const tableState = useDataTableState();
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useAuditLogs(filters, tableState.pageParams);

  // Cột khai báo trong useMemo (tiêu đề theo ngôn ngữ). Không cho sắp xếp: backend luôn xếp mới nhất trước.
  const columns = useMemo(() => {
    const col = createDataTableColumns<AuditLogEntry>();
    return col.columns([
      col.accessor("createdAt", {
        header: t("Columns.time"),
        cell: (c) => {
          const time = formatDateTime(c.getValue());
          return (
            <button
              type="button"
              onClick={() => setSelected(c.row.original)}
              className={`${linkButtonClass} font-medium whitespace-nowrap text-primary`}
              aria-label={t("Columns.openEntry", { time })}
            >
              <time dateTime={c.getValue()}>{time}</time>
            </button>
          );
        },
      }),
      col.accessor("action", {
        header: t("Columns.action"),
        cell: (c) => {
          const category = c.row.original.category;
          return (
            <span className="flex flex-col">
              <span>{actionLabel(c.getValue())}</span>
              <span className="text-xs text-muted-foreground">
                {t.has(`categories.${category}` as never) ? t(`categories.${category}` as never) : category}
              </span>
            </span>
          );
        },
      }),
      col.accessor("outcome", {
        header: t("Columns.result"),
        cell: (c) => (
          <Badge variant={c.getValue() === "SUCCESS" ? "success" : "destructive"}>{t(`outcomes.${c.getValue()}`)}</Badge>
        ),
      }),
      col.accessor("actor", {
        header: t("Columns.actor"),
        cell: (c) => {
          const actor = c.getValue();
          if (actor?.id && actor.email) {
            const label = actor.email;
            return (
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => updateFilters({ actorId: actor.id ?? undefined, actorLabel: label })}
                title={t("Columns.filterBy", { label })}
              >
                {label}
              </button>
            );
          }
          // Đăng nhập sai bằng email chưa đăng ký: không có người thực hiện, hiện email đã gõ (nếu có).
          const attempted = c.row.original.metadata?.attemptedEmail;
          return (
            <span className="text-muted-foreground">
              {actor?.email ?? (typeof attempted === "string" ? attempted : t("List.system"))}
            </span>
          );
        },
      }),
      col.accessor("target", {
        header: t("Columns.target"),
        cell: (c) => {
          const target = c.getValue();
          if (!target) return <span className="text-muted-foreground">—</span>;
          const label = target.label ?? target.id ?? "—";
          if (!target.id || (target.type !== "USER" && target.type !== "ROLE")) return label;
          return (
            <button
              type="button"
              className={linkButtonClass}
              onClick={() =>
                updateFilters({ targetType: target.type as "USER" | "ROLE", targetId: target.id ?? undefined, targetLabel: label })
              }
              title={t("Columns.filterBy", { label })}
            >
              {label}
            </button>
          );
        },
      }),
      col.accessor("ipAddress", {
        header: t("Columns.ip"),
        cell: (c) => <span className="whitespace-nowrap">{c.getValue() ?? "—"}</span>,
      }),
    ]);
  }, [t, actionLabel, updateFilters]);

  const actionItems: Record<string, string> = { [ALL]: t("Filters.allActions") };
  for (const actions of Object.values(AUDIT_ACTIONS_BY_CATEGORY)) {
    for (const action of actions) actionItems[action] = actionLabel(action);
  }
  const outcomeItems: Record<string, string> = {
    [ALL]: t("Filters.allOutcomes"),
    ...Object.fromEntries(AUDIT_OUTCOMES.map((outcome) => [outcome, t(`outcomes.${outcome}`)])),
  };

  return (
    <>
      <PageHeader title={t("List.title")} description={t("List.description")} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            value={filters.action ?? ALL}
            onValueChange={(value) => updateFilters({ action: value === ALL ? undefined : (value as AuditAction) })}
            items={actionItems}
          >
            <SelectTrigger className="w-full bg-card sm:w-60" aria-label={t("Filters.action")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("Filters.allActions")}</SelectItem>
              {(Object.entries(AUDIT_ACTIONS_BY_CATEGORY) as [AuditCategory, readonly AuditAction[]][]).map(
                ([category, actions]) => (
                  <SelectGroup key={category}>
                    <SelectLabel>{t(`categories.${category}`)}</SelectLabel>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {actionLabel(action)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ),
              )}
            </SelectContent>
          </Select>

          <Select
            value={filters.outcome ?? ALL}
            onValueChange={(value) => updateFilters({ outcome: value === ALL ? undefined : (value as AuditOutcome) })}
            items={outcomeItems}
          >
            <SelectTrigger className="w-full bg-card sm:w-40" aria-label={t("Filters.outcome")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(outcomeItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangeFilter from={filters.from} to={filters.to} onChange={(from, to) => updateFilters({ from, to })} />

          {hasActiveFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              {t("Filters.clear")}
            </Button>
          )}
        </div>

        {/* Lọc theo người: hiện thành chip có nút bỏ lọc. */}
        {(filters.actorId || filters.targetId) && (
          <div className="flex flex-wrap gap-2">
            {filters.actorId && (
              <FilterChip
                label={t("Filters.actor", { label: filters.actorLabel ?? filters.actorId })}
                removeLabel={t("Filters.removeFilter")}
                onRemove={() => updateFilters({ actorId: undefined, actorLabel: undefined })}
              />
            )}
            {filters.targetId && (
              <FilterChip
                label={t("Filters.target", { label: filters.targetLabel ?? filters.targetId })}
                removeLabel={t("Filters.removeFilter")}
                onRemove={() => updateFilters({ targetType: undefined, targetId: undefined, targetLabel: undefined })}
              />
            )}
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        query={query}
        getRowId={(row) => row.id}
        pagination={tableState.pagination}
        onPaginationChange={tableState.bind.onPaginationChange}
        empty={<EmptyState title={t("List.empty")} />}
      />

      <AuditLogSheet entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function FilterChip({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="h-7 max-w-full gap-1 pr-1 pl-2.5 text-sm">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="rounded-full p-0.5 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon />
      </button>
    </Badge>
  );
}
