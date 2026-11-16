"use client";

import { useState } from "react";
import Link from "next/link";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber, todayIsoDate } from "@/lib/format";
import { canLockPeriod, periodTone } from "../explanation";
import { useLateChanges, useLockCheck, useLockPeriod, useTimesheetErrorMessage, useTimesheetPeriods } from "../hooks";
import type { LockResult, PeriodRow } from "../types";

/**
 * Kỳ công theo năm: 12 tháng với trạng thái và số ngày còn chặn. Chọn một kỳ để xem kiểm tra trước khi chốt (ngày
 * thiếu check-out chưa quyết, cảnh báo), chốt kỳ (không mở lại được) hoặc, với kỳ đã chốt, xem các thay đổi muộn.
 */
export function PeriodsPage() {
  const t = useTranslations("TimesheetPeriods");
  const thisYear = Number(todayIsoDate().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [selected, setSelected] = useState<string | null>(null);
  const periods = useTimesheetPeriods(year);
  const yearChoices = Array.from({ length: 5 }, (_, i) => String(thisYear + 1 - i)).map((value) => ({ value, label: value }));
  const row = periods.data?.find((p) => p.month === selected) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="w-28">
            <ChoiceSelect
              value={String(year)}
              onChange={(value) => {
                if (value) {
                  setYear(Number(value));
                  setSelected(null);
                }
              }}
              choices={yearChoices}
              ariaLabel={t("year")}
            />
          </div>
        }
      />

      {periods.isPending ? (
        <LoadingState />
      ) : periods.isError ? (
        <ErrorState error={periods.error} onRetry={() => periods.refetch()} />
      ) : periods.data.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("month")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("blockers")}</TableHead>
                  <TableHead>{t("lockedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.data.map((p) => (
                  <TableRow
                    key={p.month}
                    className="cursor-pointer"
                    data-state={p.month === selected ? "selected" : undefined}
                    onClick={() => setSelected(p.month)}
                  >
                    <TableCell className="font-medium tabular-nums">{p.month}</TableCell>
                    <TableCell>
                      <Badge variant={periodTone(p.status)}>{t(`statuses.${p.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.status === "OPEN" ? formatNumber(p.blockerCount) : "—"}</TableCell>
                    <TableCell>
                      {formatDateTime(p.lockedAt)}
                      {p.lockedByName && <span className="ml-1 text-xs text-muted-foreground">{p.lockedByName}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {row ? <PeriodPanel key={row.month} row={row} /> : <EmptyState title={t("pick")} />}
        </div>
      )}
    </div>
  );
}

function PeriodPanel({ row }: { row: PeriodRow }) {
  const t = useTranslations("TimesheetPeriods");
  const open = row.status === "OPEN";
  const check = useLockCheck(open ? row.month : null);
  const lateChanges = useLateChanges(row.month, !open);
  const lock = useLockPeriod();
  const errorMessage = useTimesheetErrorMessage();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<LockResult | null>(null);

  async function doLock() {
    try {
      const done = await lock.mutateAsync(row.month);
      setResult(done);
      setConfirming(false);
      toast.success(done.alreadyLocked ? t("alreadyLocked") : t("locked", { month: row.month }));
    } catch (error) {
      setConfirming(false);
      toast.error(errorMessage(error));
    }
  }

  const c = check.data;
  const lockable = open && !!c && canLockPeriod({ status: row.status, canLock: c.canLock, blockerCount: c.blockerTotal });

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold tabular-nums">{row.month}</h2>
          <p className="text-xs text-muted-foreground">
            {formatDate(row.startDate)} – {formatDate(row.endDate)}
          </p>
        </div>
        <Badge variant={periodTone(row.status)}>{t(`statuses.${row.status}`)}</Badge>
      </div>

      {result && (
        <Alert>
          <AlertTitle>{result.alreadyLocked ? t("alreadyLocked") : t("locked", { month: result.month })}</AlertTitle>
          {result.summary && (
            <AlertDescription>
              {t("summary", { employees: result.summary.employees, days: result.summary.days, changed: result.summary.changedDays })}
            </AlertDescription>
          )}
        </Alert>
      )}

      {open && (
        <>
          {check.isPending ? (
            <LoadingState />
          ) : check.isError ? (
            <ErrorState error={check.error} onRetry={() => check.refetch()} />
          ) : (
            c && (
              <div className="space-y-3">
                {c.scope === "OFFICE" && <p className="text-xs text-muted-foreground">{t("officeScope")}</p>}
                {c.blockerTotal > 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("blockedTitle", { count: c.blockerTotal })}</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-sm">
                        {c.blockers.map((b) => (
                          <li key={`${b.employeeId}-${b.date}`} className="tabular-nums">
                            {b.name ?? "—"} · {formatDate(b.date)}
                          </li>
                        ))}
                      </ul>
                      {c.blockerTotal > c.blockers.length && (
                        <p className="mt-1 text-xs">{t("blockersMore", { count: c.blockerTotal - c.blockers.length })}</p>
                      )}
                      <Link href="/attendance/missing-out" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
                        {t("goDecide")}
                      </Link>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-success">{t("noBlockers")}</p>
                )}
                <dl className="space-y-1 text-sm">
                  <WarningRow label={t("warnings.pendingExplanations")} value={c.warnings.pendingExplanations} />
                  <WarningRow label={t("warnings.pendingLeaveRequests")} value={c.warnings.pendingLeaveRequests} />
                  <WarningRow label={t("warnings.absentUnexplained")} value={c.warnings.absentUnexplained} />
                  <WarningRow label={t("warnings.employeesWithoutRows")} value={c.warnings.employeesWithoutRows} />
                </dl>
              </div>
            )
          )}
          <Button className="w-full" disabled={!lockable || lock.isPending} onClick={() => setConfirming(true)}>
            <LockIcon /> {t("lock")}
          </Button>
          {c && !c.canLock && c.scope === "OFFICE" && <p className="text-xs text-muted-foreground">{t("lockCompanyOnly")}</p>}
        </>
      )}

      {!open && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("lateChanges")}</h3>
          {lateChanges.isPending ? (
            <LoadingState />
          ) : lateChanges.isError ? (
            <ErrorState error={lateChanges.error} onRetry={() => lateChanges.refetch()} />
          ) : lateChanges.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("lateChangesEmpty")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lateChanges.data.map((item) => (
                <li key={item.id} className="rounded-lg border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums">{formatDate(item.workDate)}</span>
                    <Badge variant={item.consumedPayrollPeriod ? "secondary" : "warning"}>
                      {item.consumedPayrollPeriod ? t("consumed") : t("notConsumed")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(`sources.${item.source}`)}
                    {item.proposedPaidUnits != null && ` · ${t("proposed", { value: formatNumber(item.proposedPaidUnits) })}`}
                  </p>
                  {item.reason && <p className="text-xs">{item.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming && (
        <Dialog open onOpenChange={(next) => !next && !lock.isPending && setConfirming(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("confirmTitle", { month: row.month })}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={lock.isPending}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" onClick={doLock} disabled={lock.isPending}>
                {lock.isPending && <Spinner />} {t("confirmLock")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function WarningRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value > 0 ? "font-medium tabular-nums text-warning" : "tabular-nums"}>{formatNumber(value)}</dd>
    </div>
  );
}
