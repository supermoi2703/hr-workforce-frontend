"use client";

import { useState } from "react";
import { ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { endOfDay, hhmm } from "../calendar";
import { useMySchedule, useMyShiftChanges, useSubmitShiftChange, useTimesheetErrorMessage, useWithdrawShiftChange } from "../hooks";
import type { MyWorkSchedule, ShiftChangeStatus } from "../types";

const STATUS_VARIANT: Record<ShiftChangeStatus, "warning" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

/**
 * Giờ làm của tôi: giờ đang áp dụng (văn phòng hoặc đăng ký riêng), sáng / nghỉ trưa / chiều, giờ sắp áp dụng, đơn
 * đang chờ (rút được), lịch sử đơn. Nút "Đăng ký giờ làm": chọn giờ bắt đầu, giờ kết thúc tự cộng 9 tiếng; quản lý
 * trực tiếp duyệt, áp dụng từ ngày hôm sau ngày duyệt.
 */
export function MySchedulePanel() {
  const t = useTranslations("Timesheet.schedule");
  const tSource = useTranslations("Timesheet.source");
  const schedule = useMySchedule();
  const requests = useMyShiftChanges();
  const withdraw = useWithdrawShiftChange();
  const errorMessage = useTimesheetErrorMessage();
  const [registering, setRegistering] = useState(false);

  if (schedule.isPending) return <LoadingState />;
  if (schedule.isError) return <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />;
  const s = schedule.data;
  const pending = s.pendingRequest;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("currentTitle")}</CardTitle>
          <CardDescription>{t("currentDescription", { source: tSource(s.source) })}</CardDescription>
          <CardAction>
            <Button onClick={() => setRegistering(true)} disabled={!!pending}>
              <ClockIcon /> {t("register")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <DayTimeline schedule={s} />
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("rule8Hours")}</li>
            <li>{t("ruleLate", { start: hhmm(s.startTime) })}</li>
            <li>{t("ruleHalfDay")}</li>
          </ul>
          {s.upcoming && (
            <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
              {t("upcoming", { start: hhmm(s.upcoming.startTime), end: hhmm(s.upcoming.endTime), from: formatDate(s.upcoming.effectiveFrom) })}
            </p>
          )}
          {pending && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <span>
                {pending.startTime
                  ? t("pending", { start: hhmm(pending.startTime), end: hhmm(pending.endTime) })
                  : t("pendingOffice")}
              </span>
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm" />}
                triggerLabel={t("withdraw")}
                title={t("withdrawTitle")}
                description={t("withdrawDescription")}
                confirmLabel={t("withdraw")}
                destructive
                onConfirm={async () => {
                  try {
                    await withdraw.mutateAsync(pending.id);
                    toast.success(t("withdrawn"));
                  } catch (error) {
                    toast.error(errorMessage(error));
                    throw error;
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("historyTitle")}</CardTitle>
          <CardDescription>{t("historyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.data && requests.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.sentAt")}</TableHead>
                  <TableHead>{t("columns.hours")}</TableHead>
                  <TableHead>{t("columns.effectiveFrom")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="tabular-nums">{r.startTime ? `${hhmm(r.startTime)} – ${hhmm(r.endTime)}` : t("officeHours")}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(r.effectiveFrom)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{t(`status.${r.status}`)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          )}
        </CardContent>
      </Card>

      {registering && <ShiftChangeDialog schedule={s} onClose={() => setRegistering(false)} />}
    </div>
  );
}

/** Thanh một ngày: buổi sáng, nghỉ trưa cố định 12:00–13:00, buổi chiều. */
function DayTimeline({ schedule }: { schedule: MyWorkSchedule }) {
  const t = useTranslations("Timesheet.schedule");
  const parts = [
    { label: t("morning"), from: schedule.startTime, to: schedule.lunchStart, tone: "bg-primary/10" },
    { label: t("lunch"), from: schedule.lunchStart, to: schedule.lunchEnd, tone: "bg-muted" },
    { label: t("afternoon"), from: schedule.lunchEnd, to: schedule.endTime, tone: "bg-primary/10" },
  ];
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-center">
      {parts.map((part) => (
        <div key={part.label} className={cn("rounded-lg px-3 py-3", part.tone)}>
          <div className="text-xs text-muted-foreground">{part.label}</div>
          <div className="text-lg font-semibold tabular-nums">
            {hhmm(part.from)} – {hhmm(part.to)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShiftChangeDialog({ schedule, onClose }: { schedule: MyWorkSchedule; onClose: () => void }) {
  const t = useTranslations("Timesheet.schedule");
  const submit = useSubmitShiftChange();
  const errorMessage = useTimesheetErrorMessage();
  const current = hhmm(schedule.startTime);
  // null = quay về giờ văn phòng (chỉ có khi đang dùng giờ riêng).
  const [start, setStart] = useState<string | null>(schedule.allowedStartTimes.map(hhmm).find((time) => time !== current) ?? null);
  const [reason, setReason] = useState("");

  async function send() {
    try {
      await submit.mutateAsync({ startTime: start, reason: reason.trim() });
      toast.success(t("sent"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("startTime")}</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("startTime")}>
              {schedule.allowedStartTimes.map((time) => {
                const value = hhmm(time);
                return (
                  <Button key={value} type="button" role="radio" aria-checked={start === value}
                    variant={start === value ? "default" : "outline"} onClick={() => setStart(value)}>
                    {value}
                  </Button>
                );
              })}
              {schedule.source === "PERSONAL" && (
                <Button type="button" role="radio" aria-checked={start === null}
                  variant={start === null ? "default" : "outline"} onClick={() => setStart(null)}>
                  {t("officeHours")}
                </Button>
              )}
            </div>
          </div>
          {start && (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm">
              {t("previewHours", { start, lunchStart: hhmm(schedule.lunchStart), lunchEnd: hhmm(schedule.lunchEnd), end: endOfDay(start) })}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t("effectiveRule")}</p>
          <div className="space-y-1">
            <Label htmlFor="shift-reason">{t("reason")}</Label>
            <Textarea id="shift-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={send} disabled={submit.isPending}>
            {submit.isPending && <Spinner />} {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
