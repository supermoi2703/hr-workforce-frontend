"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatNumber } from "@/lib/format";
import { usePayslip } from "../hooks";
import { displayName } from "../names";
import type { PayslipDetail } from "../types";
import { useWarningLabel } from "../use-warning-label";
import { normalizeWarnings } from "../warnings";

type PayslipDrawerProps = { month: string; employeeId: string | null; onClose: () => void };

/** Ngăn chi tiết một phiếu lương: snapshot đầu vào, các dòng phiếu, tổng và cảnh báo. */
export function PayslipDrawer({ month, employeeId, onClose }: PayslipDrawerProps) {
  const t = useTranslations("Payroll.drawer");
  const query = usePayslip(month, employeeId);
  const p = query.data;

  return (
    <Sheet open={employeeId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{p ? p.fullName : t("title")}</SheetTitle>
          <SheetDescription>{p ? `${p.employeeCode} · ${month}` : month}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          {query.isPending && employeeId ? (
            <LoadingState />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : p ? (
            <Body p={p} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Body({ p }: { p: PayslipDetail }) {
  const t = useTranslations("Payroll.drawer");
  const tGroup = useTranslations("Payroll.drawer.groups");
  const warningLabel = useWarningLabel();
  const warnings = normalizeWarnings(p.warnings);

  const facts: [string, string][] = [
    [t("office"), displayName(p.officeName, p.officeId)],
    [t("standardDays"), formatNumber(p.standardDays)],
    [t("paidDays"), formatNumber(p.paidDays)],
    [t("otNormal"), formatNumber(p.otHoursNormal)],
    [t("otWeeklyOff"), formatNumber(p.otHoursWeeklyOff)],
    [t("otHoliday"), formatNumber(p.otHoursHoliday)],
    [t("dependents"), formatNumber(p.dependents)],
    [t("kpi"), p.kpiCoefficient === null ? "—" : formatNumber(p.kpiCoefficient)],
    [t("baseSalary"), formatCurrency(p.baseSalary)],
    [t("lunch"), formatCurrency(p.lunchAllowance)],
    [t("otherAllowance"), formatCurrency(p.otherAllowance)],
    [t("performance"), formatCurrency(p.performanceSalary)],
    [t("insuranceSalary"), formatCurrency(p.insuranceSalary)],
  ];
  const totals: [string, string][] = [
    [t("blockA"), formatCurrency(p.blockA)],
    [t("blockB"), formatCurrency(p.blockB)],
    [t("adjust"), formatCurrency(p.adjust)],
    [t("gross"), formatCurrency(p.gross)],
    [t("si"), formatCurrency(p.si)],
    [t("taxable"), formatCurrency(p.taxableIncome)],
    [t("assessable"), formatCurrency(p.assessableIncome)],
    [t("pit"), formatCurrency(p.pit)],
    [t("net"), formatCurrency(p.net)],
  ];

  return (
    <>
      {p.nonDeductible && <Badge variant="info">{t("nonDeductible")}</Badge>}

      {warnings.length > 0 && (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{warningLabel(warning)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("snapshot")}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("lines")}</h3>
        {p.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLines")}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {p.lines.map((line, index) => (
              <li key={`${line.code}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {line.name} <span className="font-mono text-xs font-normal text-muted-foreground">{line.code}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tGroup.has(line.group as never) ? tGroup(line.group as never) : line.group}
                    {line.baseAmount !== null && ` · ${t("base")} ${formatCurrency(line.baseAmount)}`}
                    {line.rate !== null && ` · ${t("rate")} ${formatNumber(line.rate)}`}
                  </p>
                  {line.explanation && <p className="text-xs text-muted-foreground">{line.explanation}</p>}
                </div>
                <span className="shrink-0 font-medium tabular-nums">{formatCurrency(line.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("totals")}</h3>
        <dl className="divide-y rounded-lg border text-sm">
          {totals.map(([label, value]) => (
            <div key={label} className="flex justify-between px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
