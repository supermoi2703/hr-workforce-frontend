"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { useKpiMutation, useKpiOffices, useKpiPeriod, useKpiPeriods, useKpiReviewPage } from "../hooks";
import { nextPeriodStatus } from "../rules";
import type { Period, PeriodDetail, ReviewFilters, ReviewStatus } from "../types";
import { KpiErrorState, KpiHeader, KpiPeriodLine, useKpiMonth, type KpiPageProps } from "./common";
import { ReasonForm } from "./reason-form";
import { ReviewDialog } from "./review-dialog";
import { ReviewTable } from "./review-table";

export function ManageKpiPage({ initialMonth }: KpiPageProps) {
  const t = useTranslations("Kpi");
  const { month, valid, changeMonth } = useKpiMonth(initialMonth);
  const periods = useKpiPeriods(valid ? month.slice(0, 4) : "");
  const listed = periods.data?.find((period) => period.month === month);
  const { hasPermission } = useCurrentUser();
  const canManage = hasPermission("kpi:manage");

  return (
    <div className="space-y-6">
      <KpiHeader screen="manage" month={month} changeMonth={changeMonth} />
      {!valid ? <EmptyState title={t("pickMonth")} /> : periods.isPending ? <LoadingState />
        : periods.isError ? <KpiErrorState error={periods.error} retry={() => void periods.refetch()} />
          : <PeriodPanel key={month} month={month} listed={listed} canManage={canManage} />}
    </div>
  );
}

function PeriodPanel({ month, listed, canManage }: { month: string; listed?: Period; canManage: boolean }) {
  const t = useTranslations("Kpi");
  const query = useKpiPeriod(month, Boolean(listed));
  const period = query.data?.period ?? listed;
  return (
    <div className="space-y-6">
      <PeriodActions month={month} period={period} canManage={canManage} />
      {!period ? <EmptyState title={t("noPeriod")} />
        : query.isPending ? <LoadingState />
          : query.isError ? <KpiErrorState error={query.error} retry={() => void query.refetch()} />
            : (
              <>
                <DepartmentProgress detail={query.data} />
                <HrReviewList month={month} departments={query.data.departments} />
              </>
            )}
    </div>
  );
}

function PeriodActions({ month, period, canManage }: { month: string; period?: Period; canManage: boolean }) {
  const t = useTranslations("Kpi");
  const mutation = useKpiMutation();
  const [showUnlock, setShowUnlock] = useState(false);
  const next = period ? nextPeriodStatus(period.status) : null;
  const actionLabel = next ? t(`transition.${next}`) : "";

  if (!period && !canManage) return null;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <KpiPeriodLine status={period?.status ?? null} deadline={period?.lockDeadline} />
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {period?.status !== "LOCKED" && (
              <Button variant={period ? "outline" : "default"} disabled={mutation.isPending}
                onClick={() => mutation.mutate({ type: "recompute", month })}>
                <RefreshCwIcon />{t(period ? "recompute" : "openPeriod")}
              </Button>
            )}
            {next && (
              <ConfirmDialog trigger={<Button disabled={mutation.isPending || (next === "LOCKED" && !period?.timesheetLocked)} />}
                triggerLabel={actionLabel} title={actionLabel} description={t(`transitionHint.${next}`)}
                confirmLabel={actionLabel}
                onConfirm={() => mutation.mutateAsync({ type: "transition", month, status: next })} />
            )}
            {period?.status === "LOCKED" && !period.payrollSubmitted && (
              <Button variant="outline" disabled={mutation.isPending} aria-expanded={showUnlock}
                onClick={() => setShowUnlock(!showUnlock)}>{t("unlockPeriod")}</Button>
            )}
          </div>
        )}
      </div>
      {period && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant={period.timesheetLocked ? "success" : "warning"}>{t(period.timesheetLocked ? "timesheetLocked" : "timesheetOpen")}</Badge>
            {period.payrollSubmitted && <Badge variant="secondary">{t("payrollSubmitted")}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["total", "locked", "adjusted", "pmNotRated"] as const).map((key) => (
              <dl key={key} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{t(`progress.${key}`)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{period.progress[key]}</dd>
              </dl>
            ))}
          </div>
          {period.computedAt && <p className="text-xs text-muted-foreground">{t("computedAt", { date: formatDateTime(period.computedAt) })}</p>}
          {canManage && next === "LOCKED" && !period.timesheetLocked && <p className="text-sm">{t("errors.timesheetNotLocked")}</p>}
        </>
      )}
      {canManage && showUnlock && period?.status === "LOCKED" && !period.payrollSubmitted && (
        <div className="max-w-lg">
          <p className="mb-3 text-sm text-muted-foreground">{t("unlockPeriodHint")}</p>
          <ReasonForm type="unlock" pending={mutation.isPending} save={(reason) => mutation.mutate({
            type: "unlockPeriod", month, reason,
          }, { onSuccess: () => setShowUnlock(false) })} />
        </div>
      )}
    </section>
  );
}

function DepartmentProgress({ detail }: { detail: PeriodDetail }) {
  const t = useTranslations("Kpi");
  if (!detail.departments.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("departmentProgress")}</h2>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("department")}</TableHead>
              <TableHead>{t("progress.total")}</TableHead>
              <TableHead>{t("progress.locked")}</TableHead>
              <TableHead>{t("progress.pmNotRated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.departments.map((department) => (
              <TableRow key={department.departmentId ?? "none"}>
                <TableCell className="whitespace-normal">{department.departmentName ?? department.departmentCode ?? t("noDepartment")}</TableCell>
                <TableCell className="tabular-nums">{department.total}</TableCell>
                <TableCell className="tabular-nums">{department.locked}</TableCell>
                <TableCell className="tabular-nums">{department.pmNotRated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function HrReviewList({ month, departments }: { month: string; departments: PeriodDetail["departments"] }) {
  const t = useTranslations("Kpi");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [selected, select] = useState<string | null>(null);
  const offices = useKpiOffices();
  const query = useKpiReviewPage(month, page, filters, true);

  function changeFilter<Key extends keyof ReviewFilters>(key: Key, value: ReviewFilters[Key]) {
    setPage(0);
    setFilters({ ...filters, [key]: value });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t("employeeReviews")}</h2>
        <div className="flex flex-wrap gap-2">
          <ChoiceSelect className="min-w-36" ariaLabel={t("office")} noneLabel={t("allOffices")} disabled={offices.isPending || offices.isError}
            choices={(offices.data ?? []).map((office) => ({ value: office.id, label: office.name }))}
            value={filters.officeId ?? ""} onChange={(value) => changeFilter("officeId", value || undefined)} />
          <ChoiceSelect className="min-w-36" ariaLabel={t("department")} noneLabel={t("allDepartments")}
            choices={departments.flatMap(({ departmentName, departmentId }) => departmentId && departmentName
              ? [{ value: departmentId, label: departmentName }] : [])}
            value={filters.departmentId ?? ""} onChange={(value) => changeFilter("departmentId", value || undefined)} />
          <ChoiceSelect className="min-w-36" ariaLabel={t("reviewStatus")} noneLabel={t("allStatuses")}
            choices={["IN_REVIEW", "LOCKED"].map((value) => ({ value, label: t(value === "LOCKED" ? "status.LOCKED" : "status.IN_REVIEW") }))}
            value={filters.status ?? ""} onChange={(value) => changeFilter("status", (value || undefined) as ReviewStatus | undefined)} />
        </div>
      </div>
      {offices.isError && <KpiErrorState error={offices.error} retry={() => void offices.refetch()} />}
      {query.isPending ? <LoadingState /> : query.isError ? (
        <KpiErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.data.content.length ? <ReviewTable reviews={query.data.content} onSelect={select} />
            : <EmptyState title={t("noReviews")} />}
          {(query.data.totalPages > 1 || page > 0) && (
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("page", { page: page + 1, total: Math.max(1, query.data.totalPages) })}
              </span>
              <Button variant="outline" size="icon-sm" aria-label={t("previousPage")} disabled={page === 0}
                onClick={() => setPage(page - 1)}><ChevronLeftIcon /></Button>
              <Button variant="outline" size="icon-sm" aria-label={t("nextPage")} disabled={page + 1 >= query.data.totalPages}
                onClick={() => setPage(page + 1)}><ChevronRightIcon /></Button>
            </div>
          )}
        </>
      )}
      {selected && <ReviewDialog key={selected} id={selected} close={() => select(null)} />}
    </section>
  );
}
