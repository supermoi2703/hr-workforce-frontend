"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, HourglassIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { RequireAccess } from "@/components/shared/require-access";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { usePeriod } from "../hooks";
import { isValidMonth } from "../status";
import type { CalculateResponse } from "../types";
import { PayslipSheet } from "./payslip-sheet";
import { PeriodActions } from "./period-actions";
import { PeriodStepper, StatusLog } from "./period-stepper";
import { PeriodStatusBadge } from "./status-badge";

/** Chi tiết một kỳ lương: trạng thái, thao tác, nhật ký và bảng lương. */
export function PeriodDetailPage({ month }: { month: string }) {
  const t = useTranslations("Payroll");
  const validMonth = isValidMonth(month);
  const period = usePeriod(validMonth ? month : "");
  const [result, setResult] = useState<CalculateResponse | null>(null);

  const back = (
    <Link href="/payroll" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeftIcon /> {t("detail.back")}
    </Link>
  );

  if (!validMonth) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title={t("errors.periodNotFound")} />
      </div>
    );
  }
  if (period.isPending) return <LoadingState />;
  if (period.error) {
    const notFound = isApiError(period.error) && period.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        {notFound ? <EmptyState title={t("errors.periodNotFound")} /> : <ErrorState error={period.error} onRetry={() => period.refetch()} />}
      </div>
    );
  }

  const p = period.data;
  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={t("detail.title", { month: p.month })}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <PeriodStatusBadge status={p.status} />
            {t("detail.range", { from: formatDate(p.startDate), to: formatDate(p.endDate) })}
            {" · "}
            {t("detail.employees", { count: p.employees })}
            {p.complaintDeadline && ` · ${t("detail.deadline", { date: formatDate(p.complaintDeadline) })}`}
          </span>
        }
        actions={
          <>
            <Link href={`/payroll/${p.month}/inputs`} className={buttonVariants({ variant: "outline" })}>
              {t("detail.inputs")}
            </Link>
            {(p.status === "PUBLISHED" || p.status === "CLOSED") && (
              <RequireAccess access={{ permissions: ["payroll:manage"] }} fallback={null}>
                <Link href={`/payroll/complaints?month=${p.month}`} className={buttonVariants({ variant: "outline" })}>
                  {t("detail.complaints")}
                </Link>
              </RequireAccess>
            )}
            <PeriodActions period={p} onCalculated={setResult} />
          </>
        }
      />

      {p.pendingApproval && (
        <Alert>
          <HourglassIcon />
          <AlertTitle>{t("pending.title")}</AlertTitle>
          <AlertDescription>
            {t("pending.description")}{" "}
            <Link href="/approvals" className="font-medium underline">
              {t("pending.link")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {result && result.month === p.month && (
        <Alert>
          <AlertTitle>{t("calc.title")}</AlertTitle>
          <AlertDescription>
            <ul className="space-y-0.5">
              <li>{t("calc.payslips", { count: result.payslips })}</li>
              <li>{t("calc.warnings", { count: result.warnings })}</li>
              <li>{t("calc.errors", { count: result.errors })}</li>
              <li>{t("calc.skipped", { count: result.skippedWithoutContract })}</li>
              {result.totalGross !== null && (
                <li>
                  {t("calc.gross")} {formatCurrency(result.totalGross)} · {t("calc.net")} {formatCurrency(result.totalNet)}
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <PeriodStepper period={p} />

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">{t("log.title")}</h2>
        <StatusLog period={p} />
      </section>

      {p.status === "OPEN" || p.status === "LOCKED" ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">{t("sheet.title")}</h2>
          <EmptyState title={t("sheet.emptyNotCalculated")} />
        </section>
      ) : (
        <PayslipSheet month={p.month} status={p.status} />
      )}
    </div>
  );
}
