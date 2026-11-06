"use client";

import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addDays, monthRange, statusTone, weekdayIndex, type Tone } from "../calendar";
import { useTeamTimesheet } from "../hooks";
import type { TimesheetDay } from "../types";
import { CELL_TONE } from "./status-badge";

/**
 * Lịch đội trong tháng (quản lý): mỗi hàng một người, mỗi cột một ngày. Ô tô màu theo trạng thái để thấy nhanh ai
 * nghỉ, ai WFH, ai muộn, ai vắng trước khi duyệt đơn. Chỉ có đơn đã duyệt; đơn đang chờ xem ở trang Nghỉ phép. Ô viền
 * vàng là ngày có cờ chấm ngoài văn phòng, cột cuối đếm số ngày đó để HR rà soát.
 */
export function TeamCalendar({ month, today }: { month: string; today: string }) {
  const t = useTranslations("Timesheet");
  const { from, to } = monthRange(month);
  const team = useTeamTimesheet(from, to, true);

  if (team.isPending) return <LoadingState />;
  if (team.isError) return <ErrorState error={team.error} onRetry={() => team.refetch()} />;
  if (team.data.length === 0) return <EmptyState title={t("team.emptyTitle")} description={t("team.emptyDescription")} />;

  const dates: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);

  return (
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
                <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                  <div className="font-medium">{sheet.employee.fullName}</div>
                  <div className="text-muted-foreground">{sheet.employee.employeeCode}</div>
                </td>
                {dates.map((date) => (
                  <td key={date} className="p-0.5">
                    <TeamCell day={byDate.get(date)} today={today} />
                  </td>
                ))}
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

function TeamCell({ day, today }: { day: TimesheetDay | undefined; today: string }) {
  const t = useTranslations("Timesheet");
  if (!day || day.dayType === "WEEKLY_OFF") return <div className="h-7 rounded bg-muted/30" />;
  const future = day.workDate > today;
  // Ngày tương lai chỉ hiện nghỉ / WFH đã duyệt (và nửa ngày), không hiện trạng thái "chưa tới".
  const status = future && !day.leavePart && !day.remotePart ? null : day.status;
  const label = day.leavePart && day.leavePart !== "FULL_DAY" ? "½" : day.remotePart && (future || day.status === "UPCOMING") ? "R" : status ? (SHORT[status] ?? "") : "";
  const tone: Tone = day.leavePart || (day.remotePart && future) ? "info" : status ? statusTone(status) : "muted";
  const title = [formatDate(day.workDate), status ? t(`status.${status}`) : t(`dayType.${day.dayType}`),
    day.leavePart ? t(`leavePart.${day.leavePart}`) : null, day.remotePart ? t(`remotePart.${day.remotePart}`) : null,
    day.outsideOffice ? t("outsideOffice") : null].filter(Boolean).join(" · ");
  return (
    <div title={title} className={cn("flex h-7 items-center justify-center rounded font-medium", CELL_TONE[tone], TEXT_TONE[tone], day.outsideOffice && "ring-1 ring-warning ring-inset")}>
      {label}
    </div>
  );
}
