"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, InfoIcon, OctagonAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLeavePreview, useLeaveTypes, useSubmitLeave, useTimesheetErrorMessage } from "../hooks";
import type { LeaveDraft, LeavePart, LeaveTypeCode } from "../types";

const PARTS: LeavePart[] = ["FULL_DAY", "MORNING", "AFTERNOON"];

type LeaveRequestDialogProps = {
  /** Ngày bấm từ lịch; không có thì mặc định hôm nay. */
  initialDate: string;
  /** Buổi còn trống của ngày đó (từ lịch); mặc định cả ba. */
  allowedParts?: LeavePart[];
  onClose: () => void;
};

/**
 * Xin nghỉ cả ngày hoặc một buổi. Mỗi lần đổi loại / ngày / buổi, backend tính lại số ngày thực (bỏ cuối tuần, ngày
 * lễ), số phép còn lại sau đơn, có cần thêm bước HR không, và đánh dấu gấp nếu gửi muộn hơn hạn báo trước. Đơn gấp
 * vẫn gửi được, người duyệt thấy dấu "Gấp".
 */
export function LeaveRequestDialog({ initialDate, allowedParts: givenParts, onClose }: LeaveRequestDialogProps) {
  const allowedParts = givenParts && givenParts.length > 0 ? givenParts : PARTS;
  const t = useTranslations("Leave.dialog");
  const tLeave = useTranslations("Leave");
  const errorMessage = useTimesheetErrorMessage();
  const types = useLeaveTypes();
  const submit = useSubmitLeave();
  const [leaveType, setLeaveType] = useState<LeaveTypeCode>("ANNUAL");
  const [part, setPart] = useState<LeavePart>(allowedParts[0] ?? "FULL_DAY");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [reason, setReason] = useState("");

  const effectiveEnd = part === "FULL_DAY" ? (endDate < startDate ? startDate : endDate) : startDate;
  const draft = useMemo<LeaveDraft | null>(
    () => (startDate ? { leaveType, startDate, endDate: effectiveEnd, part } : null),
    [leaveType, startDate, effectiveEnd, part],
  );
  const preview = useLeavePreview(draft);
  const p = preview.data;
  const problem = p?.problem ?? null;
  const canSend = !!draft && !!p && !problem && reason.trim().length > 0 && !submit.isPending && !preview.isFetching;

  async function send() {
    if (!draft) return;
    try {
      await submit.mutateAsync({ draft, reason: reason.trim() });
      toast.success(t("sent"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="leave-type">{t("type")}</Label>
            <Select value={leaveType} onValueChange={(value) => value && setLeaveType(value as LeaveTypeCode)}>
              <SelectTrigger id="leave-type" className="w-full">
                <SelectValue>{tLeave(`types.${leaveType}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(types.data ?? []).map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {tLeave(`types.${type.code}`)}
                    <span className="ml-2 text-xs text-muted-foreground">{type.paid ? t("paid") : t("unpaid")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("part")}</Label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("part")}>
              {PARTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={part === value}
                  variant={part === value ? "default" : "outline"}
                  disabled={!allowedParts.includes(value) && startDate === initialDate}
                  onClick={() => setPart(value)}
                >
                  {tLeave(`parts.${value}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className={cn("grid gap-3", part === "FULL_DAY" && "sm:grid-cols-2")}>
            <div className="space-y-1">
              <Label htmlFor="leave-start">{part === "FULL_DAY" ? t("from") : t("day")}</Label>
              <Input id="leave-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {part === "FULL_DAY" && (
              <div className="space-y-1">
                <Label htmlFor="leave-end">{t("to")}</Label>
                <Input id="leave-end" type="date" value={effectiveEnd} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          <PreviewBox loading={preview.isPending && !!draft} problem={problem} problemText={problem ? errorMessage(problem) : null} preview={p} />

          <div className="space-y-1">
            <Label htmlFor="leave-reason">{t("reason")}</Label>
            <Textarea
              id="leave-reason"
              value={reason}
              maxLength={500}
              rows={3}
              placeholder={p?.shortNotice ? t("reasonUrgentPlaceholder") : t("reasonPlaceholder")}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={send} disabled={!canSend}>
            {submit.isPending && <Spinner />} {p?.shortNotice ? t("sendUrgent") : t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PreviewBoxProps = {
  loading: boolean;
  problem: string | null;
  problemText: string | null;
  preview: ReturnType<typeof useLeavePreview>["data"];
};

function PreviewBox({ loading, problem, problemText, preview }: PreviewBoxProps) {
  const t = useTranslations("Leave.dialog");
  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> {t("checking")}</div>;
  if (!preview) return null;
  if (problem) {
    return (
      <Alert variant="destructive">
        <OctagonAlertIcon />
        <AlertDescription>{problemText}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t("days")}</span>
          <span className="font-medium tabular-nums">{t("daysValue", { days: formatNumber(preview.days) })}</span>
        </div>
        {preview.balanceAvailable !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("balance")}</span>
            <span className="font-medium tabular-nums">
              {t("balanceValue", { before: formatNumber(preview.balanceAvailable), after: formatNumber(preview.balanceAfter) })}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t("approvers")}</span>
          <span className="text-right font-medium">{preview.needsHrStep ? t("approversWithHr") : t("approversManager")}</span>
        </div>
      </div>

      {preview.shortNotice && (
        <Alert className="border-warning/40 text-warning">
          <AlertTriangleIcon />
          <AlertTitle>{t("urgentTitle")}</AlertTitle>
          <AlertDescription className="text-warning/90">
            {t("urgentDescription", {
              days: preview.minNoticeDays,
              deadline: preview.onTimeDeadline ? formatDate(preview.onTimeDeadline) : "—",
            })}
          </AlertDescription>
        </Alert>
      )}
      {preview.backdated && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{t("backdated")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
