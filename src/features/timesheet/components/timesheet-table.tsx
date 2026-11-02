"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hhmm, weekdayIndex } from "../calendar";
import type { EmployeeTimesheet } from "../types";
import { DayStatusBadge } from "./status-badge";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Bảng công dạng danh sách để đối chiếu từng ngày: mỗi dòng một ngày đã tới, tổng cuối bảng (công, lần muộn / sớm,
 * ngày nghỉ có đơn, vắng, thiếu giờ ra). Ngày tương lai không hiện.
 */
export function TimesheetTable({ sheet, today, onSelect }: { sheet: EmployeeTimesheet; today: string; onSelect: (day: string) => void }) {
  const t = useTranslations("Timesheet");
  const days = sheet.days.filter((day) => day.workDate <= today);
  const s = sheet.summary;

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.hours")}</TableHead>
            <TableHead>{t("table.in")}</TableHead>
            <TableHead>{t("table.out")}</TableHead>
            <TableHead className="text-right">{t("table.late")}</TableHead>
            <TableHead className="text-right">{t("table.early")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-right">{t("table.paidUnits")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => {
            const working = day.dayType === "WORKING_DAY";
            return (
              <TableRow key={day.workDate} className={cn("cursor-pointer", !working && "text-muted-foreground")} onClick={() => onSelect(day.workDate)}>
                <TableCell className="tabular-nums">
                  {formatDate(day.workDate)}
                  <span className="ml-2 text-xs text-muted-foreground">{t(`weekdays.${WEEKDAYS[weekdayIndex(day.workDate)]}`)}</span>
                </TableCell>
                <TableCell className="tabular-nums">{working ? `${hhmm(day.scheduledStart)} – ${hhmm(day.scheduledEnd)}` : "—"}</TableCell>
                <TableCell className="tabular-nums">{formatTime(day.firstIn)}</TableCell>
                <TableCell className="tabular-nums">{formatTime(day.lastOut)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", day.lateMinutes > 0 && "text-warning")}>{day.lateMinutes || "—"}</TableCell>
                <TableCell className={cn("text-right tabular-nums", day.earlyMinutes > 0 && "text-warning")}>{day.earlyMinutes || "—"}</TableCell>
                <TableCell>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <DayStatusBadge status={day.status} />
                    {day.leavePart && day.leavePart !== "FULL_DAY" && (
                      <span className="text-xs text-info">{t(`leavePart.${day.leavePart}`)}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{working || day.dayType === "HOLIDAY" ? formatNumber(day.paidUnits) : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={8}>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>{t("summary.paidUnits", { value: formatNumber(s.paidUnits) })}</span>
                <span>{t("summary.late", { count: s.lateCount, minutes: s.lateMinutes })}</span>
                <span>{t("summary.early", { count: s.earlyCount, minutes: s.earlyMinutes })}</span>
                <span>{t("summary.leave", { value: formatNumber(s.leaveDays) })}</span>
                <span>{t("summary.absent", { count: s.absentCount })}</span>
                <span>{t("summary.missingOut", { count: s.missingOutCount })}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
