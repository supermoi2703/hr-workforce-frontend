"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type ReasonAction = "decline" | "cancel" | "withdraw";

/** Từ chối / hủy / rút một phiếu, kèm lý do không bắt buộc. Lỗi do nơi gọi tự báo; dialog giữ nguyên khi lỗi. */
export function ReasonDialog({
  action,
  subject,
  onConfirm,
  onClose,
}: {
  action: ReasonAction;
  /** Phiếu đang thao tác, vd "CRM-7 · 10/12/2026 18:00–21:00". */
  subject: string;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useTranslations("Overtime.reasonDialog");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      // nơi gọi đã báo lỗi
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`${action}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`${action}.description`)} <span className="font-medium text-foreground">{subject}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="overtime-reason">{t("reason")}</Label>
          <Textarea id="overtime-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("back")}
          </Button>
          <Button variant={action === "withdraw" ? "default" : "destructive"} onClick={confirm} disabled={pending}>
            {pending && <Spinner />} {t(`${action}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
