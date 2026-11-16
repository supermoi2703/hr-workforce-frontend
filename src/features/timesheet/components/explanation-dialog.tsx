"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { isValidClaim, toInstant } from "../explanation";
import { useSubmitExplanation, useTimesheetErrorMessage } from "../hooks";

/**
 * Giải trình công cho một ngày đã qua (trong 7 ngày): khai giờ vào và / hoặc giờ ra thật kèm lý do. Ngày thiếu giờ ra
 * chuyển cho HR, ngày khác chuyển quản lý trực tiếp duyệt qua luồng duyệt chung. Giờ nhập theo múi giờ trình duyệt.
 */
export function ExplanationDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const t = useTranslations("Timesheet.explainDialog");
  const errorMessage = useTimesheetErrorMessage();
  const submit = useSubmitExplanation();
  const [claimedIn, setClaimedIn] = useState("");
  const [claimedOut, setClaimedOut] = useState("");
  const [reason, setReason] = useState("");
  const validClaim = isValidClaim(claimedIn, claimedOut);
  const canSend = validClaim && reason.trim().length > 0 && !submit.isPending;

  async function send() {
    try {
      await submit.mutateAsync({
        workDate: date,
        claimedIn: toInstant(date, claimedIn),
        claimedOut: toInstant(date, claimedOut),
        reason: reason.trim(),
      });
      toast.success(t("sent"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !submit.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { date: formatDate(date) })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="explain-in">{t("claimedIn")}</Label>
            <Input id="explain-in" type="time" value={claimedIn} onChange={(e) => setClaimedIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="explain-out">{t("claimedOut")}</Label>
            <Input id="explain-out" type="time" value={claimedOut} onChange={(e) => setClaimedOut(e.target.value)} />
          </div>
        </div>
        {!validClaim && <p className="text-xs text-muted-foreground">{t("claimHint")}</p>}
        <div className="space-y-1">
          <Label htmlFor="explain-reason">{t("reason")}</Label>
          <Textarea id="explain-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={send} disabled={!canSend}>
            {submit.isPending && <Spinner />} {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
