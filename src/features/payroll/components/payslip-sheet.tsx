"use client";

import { useMemo, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useSheet } from "../hooks";
import type { PayrollPeriodStatus, PayslipRow } from "../types";
import { PayslipDrawer } from "./payslip-drawer";

type PayslipSheetProps = { month: string; status: PayrollPeriodStatus };

/** Bảng lương của kỳ: phân trang phía server, lọc cảnh báo và tìm theo mã/tên; bấm "Xem" mở chi tiết phiếu. */
export function PayslipSheet({ month, status }: PayslipSheetProps) {
  const t = useTranslations("Payroll.sheet");
  const [hasWarning, setHasWarning] = useState(false);
  const [keyword, setKeyword] = useState("");
  const q = useDebouncedValue(keyword.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const tableState = useDataTableState();

  // Đổi bộ lọc thì về trang đầu.
  const filterKey = `${hasWarning}|${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const sheet = useSheet(month, {
    page: tableState.pageParams.page,
    size: tableState.pageParams.size,
    hasWarning: hasWarning || undefined,
    q: q || undefined,
  });
  const tableQuery = {
    data: sheet.data?.payslips,
    error: sheet.error,
    isPending: sheet.isPending,
    isFetching: sheet.isFetching,
    refetch: sheet.refetch,
  };
  const totals = sheet.data?.totals;
  const filtered = hasWarning || q !== "";

  const columns = useMemo(() => {
    const col = createDataTableColumns<PayslipRow>();
    const money = (value: number) => <span className="block text-right tabular-nums">{formatCurrency(value)}</span>;
    return col.columns([
      col.accessor("employeeCode", {
        header: t("code"),
        cell: (c) => <span className="font-mono text-xs tabular-nums">{c.getValue()}</span>,
      }),
      col.accessor("fullName", {
        header: t("name"),
        cell: (c) => (
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{c.getValue()}</span>
            {c.row.original.nonDeductible && <Badge variant="info">{t("nonDeductible")}</Badge>}
          </span>
        ),
      }),
      col.accessor("officeId", {
        header: t("office"),
        cell: (c) => <span className="font-mono text-xs text-muted-foreground">{c.getValue()?.slice(0, 8) ?? "—"}</span>,
      }),
      col.display({
        id: "days",
        header: t("days"),
        cell: (c) => (
          <span className="tabular-nums">
            {formatNumber(c.row.original.w)} / {formatNumber(c.row.original.n)}
          </span>
        ),
      }),
      col.accessor("blockA", { header: t("blockA"), cell: (c) => money(c.getValue()) }),
      col.accessor("blockB", { header: t("blockB"), cell: (c) => money(c.getValue()) }),
      col.accessor("adjust", { header: t("adjust"), cell: (c) => money(c.getValue()) }),
      col.accessor("gross", { header: t("gross"), cell: (c) => money(c.getValue()) }),
      col.accessor("si", { header: t("si"), cell: (c) => money(c.getValue()) }),
      col.accessor("pit", { header: t("pit"), cell: (c) => money(c.getValue()) }),
      col.accessor("net", { header: t("net"), cell: (c) => <strong className="block text-right tabular-nums">{formatCurrency(c.getValue())}</strong> }),
      col.display({
        id: "warnings",
        header: () => <span className="sr-only">{t("warning")}</span>,
        cell: (c) => {
          const warnings = c.row.original.warnings;
          if (warnings.length === 0) return null;
          return (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex text-warning" aria-label={t("warning")} />}>
                <TriangleAlertIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                <ul className="space-y-0.5">
                  {warnings.map((code) => (
                    <li key={code}>
                      {code}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          );
        },
      }),
      col.display({
        id: "view",
        header: () => <span className="sr-only">{t("view")}</span>,
        cell: (c) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original.employeeId)}>
            {t("view")}
          </Button>
        ),
      }),
    ]);
  }, [t]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-heading text-lg font-semibold">{t("title")}</h2>
        <Input
          className="w-64"
          type="search"
          value={keyword}
          placeholder={t("search")}
          aria-label={t("search")}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Label className="gap-2 font-normal">
          <Checkbox checked={hasWarning} onCheckedChange={(checked) => setHasWarning(checked === true)} />
          {t("onlyWarnings")}
        </Label>
      </div>

      <DataTable
        columns={columns}
        query={tableQuery}
        {...tableState.bind}
        sorting={undefined}
        onSortingChange={undefined}
        getRowId={(row) => row.employeeId}
        empty={
          <EmptyState
            title={filtered ? t("emptyFiltered") : status === "OPEN" || status === "LOCKED" ? t("emptyNotCalculated") : t("empty")}
          />
        }
      />

      {totals && (
        <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-5">
          <Total label={filtered ? t("totalsFiltered") : t("totals")} value={t("lines", { count: totals.lines })} />
          <Total label={t("gross")} value={formatCurrency(totals.gross)} />
          <Total label={t("si")} value={formatCurrency(totals.si)} />
          <Total label={t("pit")} value={formatCurrency(totals.pit)} />
          <Total label={t("net")} value={formatCurrency(totals.net)} />
        </dl>
      )}

      <PayslipDrawer month={month} employeeId={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
