"use client";

import { TreePalmIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate, formatNumber, formatTime } from "@/lib/format";
import { canRequestLeave, hhmm, requestsOn } from "../calendar";
import type { LeaveRequest, TimesheetDay } from "../types";
import { DayStatusBadge, LeaveStatusBadge } from "./status-badge";

type DayDetailProps = {
  day: TimesheetDay | undefined;
  date: string;
  today: string;
  requests: LeaveRequest[];
  onRequestLeave: () => void;
};

/** Chi tiết một ngày bấm trên lịch: giờ phải có mặt, vào / ra, muộn / sớm, công, đơn nghỉ; nút xin nghỉ. */
export function DayDetail({ day, date, today, requests, onRequestLeave }: DayDetailProps) {
  const t = useTranslations("Timesheet.day");
  const tStatus = useTranslations("Timesheet");
  const tLeave = useTranslations("Leave");
  const onDay = requestsOn(requests, date);
  const past = date < today;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="first-letter:uppercase">{formatLongDate(date)}</CardTitle>
        <CardDescription>
          {day ? tStatus(`dayType.${day.dayType}`) : t("noData")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {day && (
          <DetailList>
            {day.dayType === "WORKING_DAY" && (
              <DetailRow label={t("hours")}>
                <span className="tabular-nums">
                  {hhmm(day.scheduledStart)} – {hhmm(day.scheduledEnd)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{tStatus(`source.${day.scheduleSource}`)}</span>
              </DetailRow>
            )}
            {(past || date === today) && (
              <DetailRow label={t("status")}>
                <DayStatusBadge status={day.status} />
              </DetailRow>
            )}
            {day.firstIn && (
              <DetailRow label={t("inOut")}>
                <span className="tabular-nums">
                  {formatTime(day.firstIn)} – {day.lastOut ? formatTime(day.lastOut) : t("noOut")}
                </span>
              </DetailRow>
            )}
            {(day.lateMinutes > 0 || day.earlyMinutes > 0) && (
              <DetailRow label={t("lateEarly")}>
                {t("lateEarlyValue", { late: day.lateMinutes, early: day.earlyMinutes })}
              </DetailRow>
            )}
            {day.workedMinutes > 0 && (
              <DetailRow label={t("worked")}>
                {t("workedValue", { hours: Math.floor(day.workedMinutes / 60), minutes: day.workedMinutes % 60 })}
              </DetailRow>
            )}
            {(past || date === today) && day.dayType === "WORKING_DAY" && (
              <DetailRow label={t("paidUnits")}>{formatNumber(day.paidUnits)}</DetailRow>
            )}
          </DetailList>
        )}

        {onDay.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("leaveRequests")}</p>
            {onDay.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span>
                  {tLeave(`types.${request.leaveType}`)} · {tLeave(`parts.${request.part}`)}
                </span>
                <LeaveStatusBadge request={request} />
              </div>
            ))}
          </div>
        )}

        {day?.status === "MISSING_OUT" || day?.status === "ABSENT" ? (
          <p className="text-sm text-muted-foreground">{t("explainLater")}</p>
        ) : null}

        {canRequestLeave(day, requests) && (
          <Button className="w-full" onClick={onRequestLeave}>
            <TreePalmIcon /> {past ? t("requestSickLeave") : t("requestLeave")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
