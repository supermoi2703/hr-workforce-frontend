"use client";

import { HousePlusIcon, MessageSquareWarningIcon, TreePalmIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate, formatNumber, formatTime } from "@/lib/format";
import { awaitingHrDecision, canExplain, latestExplanationOn } from "../explanation";
import { canRequestLeave, canRequestRemote, hhmm, remoteRequestsOn, requestsOn } from "../calendar";
import type { Explanation, LeaveRequest, RemoteWorkRequest, TimesheetDay } from "../types";
import { Badge } from "@/components/ui/badge";
import { DayStatusBadge, LeaveStatusBadge } from "./status-badge";

type DayDetailProps = {
  day: TimesheetDay | undefined;
  date: string;
  today: string;
  requests: LeaveRequest[];
  remote: RemoteWorkRequest[];
  /** Giải trình của tôi (mới nhất trước), để hiện trạng thái và ẩn nút khi đang chờ. */
  explanations: Explanation[];
  onExplain: () => void;
  onRequestLeave: () => void;
  onRequestRemote: () => void;
  onHistory?: () => void;
};

/** Chi tiết một ngày bấm trên lịch: giờ phải có mặt, vào / ra, muộn / sớm, công, đơn nghỉ, WFH; nút xin nghỉ, xin WFH. */
export function DayDetail({ day, date, today, requests, remote, explanations, onExplain, onRequestLeave, onRequestRemote, onHistory }: DayDetailProps) {
  const t = useTranslations("Timesheet.day");
  const tStatus = useTranslations("Timesheet");
  const tLeave = useTranslations("Leave");
  const onDay = requestsOn(requests, date);
  const remoteOnDay = remoteRequestsOn(remote, date);
  const past = date < today;
  const waitingHr = awaitingHrDecision(day);
  const explanation = latestExplanationOn(explanations, date);

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
                {day.source === "HR_ADJUST" && <Badge variant="outline" className="ml-1">{tStatus("source.HR_ADJUST")}</Badge>}
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
              <DetailRow label={t("paidUnits")}>
                {waitingHr ? <Badge variant="warning">{t("awaitingHr")}</Badge> : formatNumber(day.paidUnits)}
              </DetailRow>
            )}
          </DetailList>
        )}

        {day && onHistory && <Button variant="outline" className="w-full" onClick={onHistory}>{tStatus("history.title")}</Button>}

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

        {remoteOnDay.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("remoteRequests")}</p>
            {remoteOnDay.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span>
                  {tLeave(`remote.reasons.${request.reason}`)} · {tLeave(`parts.${request.part}`)}
                </span>
                <LeaveStatusBadge request={request} />
              </div>
            ))}
          </div>
        )}

        {day?.remotePart && date >= today && <p className="text-sm text-muted-foreground">{t("remotePunchHint")}</p>}
        {day?.outsideOffice && <p className="text-sm text-warning">{t("outsideOfficeHint")}</p>}

        {explanation && (
          <div className="space-y-1 rounded-lg border p-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{t("explanation.title")}</span>
              <Badge variant={explanation.status === "APPROVED" ? "success" : explanation.status === "REJECTED" ? "destructive" : explanation.status === "PENDING" ? "warning" : "secondary"}>
                {t(`explanation.status.${explanation.status}`)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t(`explanation.route.${explanation.route}`)}</p>
            {explanation.decisionNote && <p className="text-xs">{explanation.decisionNote}</p>}
          </div>
        )}

        {canExplain(day, today, explanations) && (
          <Button variant="outline" className="w-full" onClick={onExplain}>
            <MessageSquareWarningIcon /> {t("explain")}
          </Button>
        )}

        {canRequestRemote(day, today, requests, remote) && (
          <Button variant="outline" className="w-full" onClick={onRequestRemote}>
            <HousePlusIcon /> {t("requestRemote")}
          </Button>
        )}

        {canRequestLeave(day, requests, remote) && (
          <Button className="w-full" onClick={onRequestLeave}>
            <TreePalmIcon /> {past ? t("requestSickLeave") : t("requestLeave")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
