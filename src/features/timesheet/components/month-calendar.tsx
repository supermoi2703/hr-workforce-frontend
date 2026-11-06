"use client";

import { useTranslations } from "next-intl";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { monthGrid, remoteRequestsOn, requestsOn, statusTone } from "../calendar";
import type { LeaveRequest, RemoteWorkRequest, TimesheetDay } from "../types";
import { CELL_TONE } from "./status-badge";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type MonthCalendarProps = {
  month: string;
  today: string;
  days: TimesheetDay[];
  /** Đơn nghỉ của tôi: hiện dấu "chờ duyệt" trên ngày (bảng công chỉ biết đơn đã duyệt). */
  requests: LeaveRequest[];
  /** Đơn WFH của tôi: hiện dấu "chờ duyệt", như đơn nghỉ. */
  remote: RemoteWorkRequest[];
  selected: string | null;
  onSelect: (day: string) => void;
};

/**
 * Lịch tháng của một người: mỗi ô là một ngày, màu theo trạng thái công, có giờ vào / ra, buổi nghỉ và đơn đang chờ.
 * Bấm vào ô để xem chi tiết và xin nghỉ.
 */
export function MonthCalendar({ month, today, days, requests, remote, selected, onSelect }: MonthCalendarProps) {
  const t = useTranslations("Timesheet");
  const byDate = new Map(days.map((day) => [day.workDate, day]));

  return (
    <div className="overflow-x-auto rounded-xl border">
      <div className="grid min-w-[42rem] grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="px-2 py-2">
            {t(`weekdays.${weekday}`)}
          </div>
        ))}
      </div>
      <div className="grid min-w-[42rem] grid-cols-7">
        {monthGrid(month).flat().map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="min-h-24 border-b border-r bg-muted/20 last:border-r-0" />;
          const day = byDate.get(date);
          const pending = requestsOn(requests, date).filter((r) => r.status === "PENDING");
          const pendingRemote = remoteRequestsOn(remote, date).filter((r) => r.status === "PENDING");
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-r p-2 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&:nth-child(7n)]:border-r-0",
                day && day.workDate <= today && CELL_TONE[statusTone(day.status)],
                day?.dayType !== "WORKING_DAY" && "text-muted-foreground",
                selected === date && "ring-2 ring-primary ring-inset",
              )}
            >
              <span className={cn("flex size-6 items-center justify-center rounded-full text-sm font-medium tabular-nums", isToday && "bg-primary text-primary-foreground")}>
                {Number(date.slice(8))}
              </span>
              {day && <CellBody day={day} today={today} />}
              {pending.length > 0 && <span className="font-medium text-warning">{t("calendar.pendingLeave")}</span>}
              {pendingRemote.length > 0 && <span className="font-medium text-warning">{t("calendar.pendingRemote")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CellBody({ day, today }: { day: TimesheetDay; today: string }) {
  const t = useTranslations("Timesheet");
  if (day.dayType === "HOLIDAY") return <span className="font-medium text-info">{t("status.HOLIDAY")}</span>;
  if (day.dayType === "WEEKLY_OFF") return null;
  const label = day.status === "UPCOMING" ? null : t(`status.${day.status}`);
  return (
    <>
      {label && <span className="font-medium">{label}</span>}
      {day.leavePart && day.leavePart !== "FULL_DAY" && <span className="text-info">{t(`leavePart.${day.leavePart}`)}</span>}
      {day.remotePart && <span className="text-info">{t(`remotePart.${day.remotePart}`)}</span>}
      {day.outsideOffice && <span className="text-warning">{t("outsideOffice")}</span>}
      {day.firstIn && (
        <span className="tabular-nums text-muted-foreground">
          {formatTime(day.firstIn)} – {day.lastOut ? formatTime(day.lastOut) : "…"}
        </span>
      )}
      {day.lateMinutes > 0 && day.workDate <= today && <span className="text-warning">{t("calendar.lateBy", { minutes: day.lateMinutes })}</span>}
    </>
  );
}
