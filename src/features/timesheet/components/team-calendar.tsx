"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addDays, monthRange, statusTone, weekdayIndex, type Tone } from "../calendar";
import { canAdjustDay } from "../adjustment";
import { useAttendanceOffices, useTeamTimesheet, useTimesheetPeriods } from "../hooks";
import type { TimesheetDay } from "../types";
import { CELL_TONE } from "./status-badge";
import { TimesheetDayDialog } from "./timesheet-day-dialog";

/**
 * Lịch đội trong tháng (quản lý): mỗi hàng một người, mỗi cột một ngày. Ô tô màu theo trạng thái để thấy nhanh ai
 * nghỉ, ai WFH, ai muộn, ai vắng trước khi duyệt đơn. Chỉ có đơn đã duyệt; đơn đang chờ xem ở trang Nghỉ phép. Ô viền
 * vàng là ngày có cờ chấm ngoài văn phòng, cột cuối đếm số ngày đó để HR rà soát.
 */
export function TeamCalendar({ month, today }: { month: string; today: string }) {
  const t = useTranslations("Timesheet");
  const { user, hasPermission, hasRole } = useCurrentUser();
  const canManage = hasPermission("attendance:manage");
  const requiresOffice = canManage && (hasRole("ADMIN") || hasRole("HR_COMPANY"));
  const [office, setOffice] = useState("");
  const offices = useAttendanceOffices(requiresOffice);
  const periods = useTimesheetPeriods(Number(month.slice(0, 4)), canManage);
  const period = !periods.isError ? periods.data?.find((row) => row.month === month)?.status : undefined;
  const [selected, setSelected] = useState<{ employeeId: string; date: string; edit: boolean } | null>(null);
  const { from, to } = monthRange(month);
  const team = useTeamTimesheet(from, to, !requiresOffice || !!office, office || undefined);

  const activeEmployee = selected && team.data?.find(({ employee }) => employee.id === selected.employeeId);
  const activeDay = selected && activeEmployee?.days.find((day) => day.workDate === selected.date);
  const mayEdit = (employeeId: string, date: string) =>
    canAdjustDay({ canManage, employeeId, date, ownEmployeeId: user?.employeeId, today, period });

  async function reloadDay() {
    const [sheet, currentPeriod] = await Promise.all([team.refetch(), periods.refetch()]);
    return sheet.isSuccess && currentPeriod.isSuccess;
  }

  const dates: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);

  const calendar = team.data?.length ? (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-10 min-w-40 bg-muted px-3 py-2 text-left font-medium">{t("team.employee")}</th>
            {dates.map((date) => (
              <th key={date} className={cn("min-w-7 px-0.5 py-2 text-center font-medium tabular-nums", weekdayIndex(date) >= 5 && "text-muted-foreground")}>
                {Number(date.slice(8))}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">{t("team.paidUnits")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("team.outsideOffice")}</th>
          </tr>
        </thead>
        <tbody>
          {team.data.map((sheet) => {
            const byDate = new Map(sheet.days.map((day) => [day.workDate, day]));
            return (
              <tr key={sheet.employee.id} className="border-t">
                <th scope="row" className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left font-normal">
                  <div className="font-medium">{sheet.employee.fullName}</div>
                  <div className="text-muted-foreground">{sheet.employee.employeeCode}</div>
                </th>
                {dates.map((date) => {
                  const day = byDate.get(date);
                  const history = day && (canManage || sheet.employee.id === user?.employeeId)
                    ? () => setSelected({ employeeId: sheet.employee.id, date, edit: false })
                    : undefined;
                  return (
                    <td key={date} className="p-0.5 align-top">
                      <TeamCell day={day} today={today} onHistory={history} />
                      {day && mayEdit(sheet.employee.id, date) && (
                        <Button variant="ghost" size="icon-xs" className="mx-auto flex"
                          aria-label={`${t("adjustment.edit")} · ${sheet.employee.fullName ?? sheet.employee.employeeCode ?? ""} · ${formatDate(date)}`}
                          title={t("adjustment.edit")}
                          onClick={() => setSelected({ employeeId: sheet.employee.id, date, edit: true })}>
                          <PencilIcon />
                        </Button>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 text-right tabular-nums">{sheet.summary.paidUnits}</td>
                <td className={cn("px-3 text-right tabular-nums", sheet.summary.outsideOfficeCount > 0 && "font-medium text-warning")}>
                  {sheet.summary.outsideOfficeCount || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : <EmptyState title={t("team.emptyTitle")} description={t("team.emptyDescription")} />;

  return (
    <div className="space-y-4">
      {requiresOffice && (
        <>
          <ChoiceSelect className="max-w-xs" value={office} onChange={(value) => { setOffice(value); setSelected(null); }}
            choices={(offices.data ?? []).map(({ id, name }) => ({ value: id, label: name }))}
            ariaLabel={t("incidents.office")} placeholder={t("incidents.pickOffice")}
            disabled={offices.isPending} />
          {offices.isError && <ErrorState error={offices.error} onRetry={() => offices.refetch()} />}
        </>
      )}
      {canManage && periods.isError && <ErrorState error={periods.error} onRetry={() => periods.refetch()} />}
      {canManage && period === "LOCKED" && (
        <p className="text-sm text-muted-foreground">
          {t("errors.adjustmentPeriodLocked")}{" "}
          <Link href={`/timesheets/periods?month=${month}`} className="font-medium text-primary underline">
            {t("adjustment.lateChanges")}
          </Link>
        </p>
      )}
      {requiresOffice && !office ? <EmptyState title={t("incidents.pickOffice")} />
        : team.isError ? <ErrorState error={team.error} onRetry={() => team.refetch()} />
        : team.isPending ? <LoadingState />
        : calendar}
      {selected && activeEmployee && activeDay && (canManage || activeEmployee.employee.id === user?.employeeId) && (
        <TimesheetDayDialog key={`${selected.employeeId}-${selected.date}`} day={activeDay}
          employeeId={selected.employeeId} employeeName={activeEmployee.employee.fullName}
          initiallyEditing={selected.edit} canEdit={mayEdit(selected.employeeId, selected.date)}
          onReload={reloadDay} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// Chữ viết tắt trong ô: P = nghỉ có đơn, R = làm từ xa, M = muộn / sớm, V = vắng, L = lễ, ✓ = đủ công.
const SHORT: Partial<Record<TimesheetDay["status"], string>> = {
  WORK: "✓",
  LATE: "M",
  EARLY: "M",
  LATE_EARLY: "M",
  MISSING_OUT: "?",
  ABSENT: "V",
  LEAVE_PAID: "P",
  LEAVE_UNPAID: "P",
  REMOTE: "R",
  HOLIDAY: "L",
  IN_PROGRESS: "•",
};

const TEXT_TONE: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  muted: "text-muted-foreground",
  outline: "",
};

function TeamCell({ day, today, onHistory }: { day: TimesheetDay | undefined; today: string; onHistory?: () => void }) {
  const t = useTranslations("Timesheet");
  if (!day) return <div className="h-7 rounded bg-muted/30" />;
  if (day.dayType === "WEEKLY_OFF" && !onHistory && day.status !== "INCIDENT" && day.source !== "HR_ADJUST") {
    return <div className="h-7 rounded bg-muted/30" />;
  }
  const future = day.workDate > today;
  // Ngày tương lai chỉ hiện nghỉ / WFH đã duyệt (và nửa ngày), không hiện trạng thái "chưa tới".
  const status = future && !day.leavePart && !day.remotePart ? null : day.status;
  const label = day.leavePart && day.leavePart !== "FULL_DAY" ? "½" : day.remotePart && (future || day.status === "UPCOMING") ? "R" : status ? (SHORT[status] ?? "") : "";
  const tone: Tone = day.leavePart || (day.remotePart && future) ? "info" : status ? statusTone(status) : "muted";
  const title = [formatDate(day.workDate), status ? t(`status.${status}`) : t(`dayType.${day.dayType}`),
    day.leavePart ? t(`leavePart.${day.leavePart}`) : null, day.remotePart ? t(`remotePart.${day.remotePart}`) : null,
    day.outsideOffice ? t("outsideOffice") : null, day.source === "HR_ADJUST" ? t("source.HR_ADJUST") : null].filter(Boolean).join(" · ");
  const classes = cn("flex min-h-7 w-full flex-col items-center justify-center rounded px-1 font-medium", CELL_TONE[tone], TEXT_TONE[tone], day.outsideOffice && "ring-1 ring-warning ring-inset");
  const content = (
    <>
      <span>{status === "INCIDENT" ? t("status.INCIDENT") : label || (onHistory && "—")}</span>
      {day.source === "HR_ADJUST" && <span>{t("source.HR_ADJUST")}</span>}
    </>
  );
  if (onHistory) {
    return (
      <button type="button" title={title} aria-label={`${t("history.title")} · ${title}`} onClick={onHistory}
        className={cn(classes, "hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring")}>
        {content}
      </button>
    );
  }
  return (
    <div title={title} className={classes}>{content}</div>
  );
}
