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
import { formatNumber } from "@/lib/format";
import { isPersonalReason, REMOTE_REASONS } from "../calendar";
import { useRemoteWorkPreview, useSubmitRemoteWork, useTimesheetErrorMessage } from "../hooks";
import type { LeavePart, RemoteWorkDraft, RemoteWorkPreview, RemoteWorkReason } from "../types";

const PARTS: LeavePart[] = ["FULL_DAY", "MORNING", "AFTERNOON"];

type RemoteWorkDialogProps = {
  /** Ngày bấm từ lịch; không có thì mặc định hôm nay. */
  initialDate: string;
  /** Buổi còn trống của ngày đó (từ lịch); mặc định cả ba. */
  allowedParts?: LeavePart[];
  onClose: () => void;
};

/**
 * Xin làm từ xa cho một ngày. Mỗi lần đổi ngày / buổi / lý do, backend kiểm tra đối tượng, hạn gửi, trùng đơn, giới hạn
 * chủ động và đánh dấu gấp. Lý do khách quan không giới hạn số ngày nhưng vẫn phải duyệt.
 */
export function RemoteWorkDialog({ initialDate, allowedParts: givenParts, onClose }: RemoteWorkDialogProps) {
  const allowedParts = givenParts && givenParts.length > 0 ? givenParts : PARTS;
  const t = useTranslations("Leave.remote.dialog");
  const tLeave = useTranslations("Leave");
  const errorMessage = useTimesheetErrorMessage();
  const submit = useSubmitRemoteWork();
  const [workDate, setWorkDate] = useState(initialDate);
  const [part, setPart] = useState<LeavePart>(allowedParts[0] ?? "FULL_DAY");
  const [reason, setReason] = useState<RemoteWorkReason>("HEALTH");
  const [detail, setDetail] = useState("");

  const draft = useMemo<RemoteWorkDraft | null>(() => (workDate ? { workDate, part, reason } : null), [workDate, part, reason]);
  const preview = useRemoteWorkPreview(draft);
  const p = preview.data;
  const problem = p?.problem ?? null;
  const canSend = !!draft && !!p && !problem && detail.trim().length > 0 && !submit.isPending && !preview.isFetching;

  async function send() {
    if (!draft) return;
    try {
      await submit.mutateAsync({ draft, detail: detail.trim() });
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
            <Label htmlFor="remote-date">{t("day")}</Label>
            <Input id="remote-date" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
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
                  disabled={!allowedParts.includes(value) && workDate === initialDate}
                  onClick={() => setPart(value)}
                >
                  {tLeave(`parts.${value}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="remote-reason">{t("reason")}</Label>
            <Select value={reason} onValueChange={(value) => value && setReason(value as RemoteWorkReason)}>
              <SelectTrigger id="remote-reason" className="w-full">
                <SelectValue>{tLeave(`remote.reasons.${reason}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REMOTE_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tLeave(`remote.reasons.${value}`)}
                    <span className="ml-2 text-xs text-muted-foreground">{isPersonalReason(value) ? t("personal") : t("objective")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PreviewBox loading={preview.isPending && !!draft} problemText={problem ? errorMessage(problem) : null} preview={p} />

          <div className="space-y-1">
            <Label htmlFor="remote-detail">{t("detail")}</Label>
            <Textarea
              id="remote-detail"
              value={detail}
              maxLength={300}
              rows={3}
              placeholder={t("detailPlaceholder")}
              onChange={(e) => setDetail(e.target.value)}
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

type PreviewBoxProps = { loading: boolean; problemText: string | null; preview: RemoteWorkPreview | undefined };

function PreviewBox({ loading, problemText, preview }: PreviewBoxProps) {
  const t = useTranslations("Leave.remote.dialog");
  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> {t("checking")}</div>;
  if (!preview) return null;
  if (problemText) {
    return (
      <Alert variant="destructive">
        <OctagonAlertIcon />
        <AlertDescription>{problemText}</AlertDescription>
      </Alert>
    );
  }
  const usage = preview.usage;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        {preview.personal ? (
          <>
            <Row label={t("usedWeek")} value={t("usedValue", { used: formatNumber(usage.personalWeek), max: usage.maxPersonalWeek })} />
            <Row label={t("usedMonth")} value={t("usedValue", { used: formatNumber(usage.personalMonth), max: usage.maxPersonalMonth })} />
          </>
        ) : (
          <Row label={t("objectiveMonth")} value={t("objectiveValue", { used: formatNumber(usage.objectiveMonth) })} />
        )}
        <Row label={t("approvers")} value={t("approversManager")} />
      </div>

      {preview.shortNotice && (
        <Alert className="border-warning/40 text-warning">
          <AlertTriangleIcon />
          <AlertTitle>{t("urgentTitle")}</AlertTitle>
          <AlertDescription className="text-warning/90">{t("urgentDescription")}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <InfoIcon />
        <AlertDescription>{t("punchHint")}</AlertDescription>
      </Alert>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}
