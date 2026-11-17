"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useCalculatePeriod,
  useChecks,
  useClosePeriod,
  useLockPeriod,
  usePayrollErrorMessage,
  usePublishPeriod,
  useRevokeApproval,
  useSubmitPeriod,
} from "../hooks";
import { hasBlockers } from "../checks";
import { ChecksBox } from "./checks-box";
import { isValidRevokeReason, knownActions, MIN_REVOKE_REASON } from "../status";
import type { CalculateResponse, CheckStep, PayrollAction, PeriodDetail } from "../types";

type PeriodActionsProps = {
  period: PeriodDetail;
  onCalculated: (result: CalculateResponse) => void;
};

/**
 * Nút thao tác theo `nextActions` backend trả về (không tự suy luận quyền ở FE, chỉ ẩn nút).
 * Backend vẫn kiểm quyền và trạng thái; lỗi hiện thành toast theo mã lỗi.
 */
export function PeriodActions({ period, onCalculated }: PeriodActionsProps) {
  const t = useTranslations("Payroll");
  const errorMessage = usePayrollErrorMessage();
  const { month } = period;
  const lock = useLockPeriod(month);
  const calculate = useCalculatePeriod(month);
  const submit = useSubmitPeriod(month);
  const revoke = useRevokeApproval(month);
  const publish = usePublishPeriod(month);
  const close = useClosePeriod(month);
  const [dialog, setDialog] = useState<"submit" | "revoke" | null>(null);

  const actions = knownActions(period.nextActions);
  if (actions.length === 0) return null;

  // Chạy một thao tác: báo thành công / lỗi bằng toast; ném lại lỗi để hộp xác nhận giữ nguyên.
  async function run(task: () => Promise<unknown>, successKey: "done.locked" | "done.published" | "done.closed" | "done.submitted" | "done.revoked") {
    try {
      await task();
      toast.success(t(successKey));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  async function doCalculate() {
    try {
      onCalculated(await calculate.mutateAsync());
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  const label = (action: PayrollAction) => t(`actions.${action}`);

  function render(action: PayrollAction) {
    switch (action) {
      case "LOCK":
        return (
          <ConfirmDialog
            key={action}
            trigger={<Button variant="outline" />}
            triggerLabel={label(action)}
            title={t("confirm.lockTitle")}
            description={t("confirm.lockDescription")}
            onConfirm={() => run(() => lock.mutateAsync(), "done.locked").catch(() => undefined)}
          />
        );
      case "CALCULATE":
        return (
          <CheckedConfirm
            key={action}
            month={month}
            step="calculate"
            triggerLabel={label(action)}
            title={t("confirm.calculateTitle")}
            description={period.status === "CALCULATED" ? t("confirm.recalculate") : t("confirm.calculateDescription")}
            onConfirm={() => doCalculate().catch(() => undefined)}
          />
        );
      case "SUBMIT":
        return (
          <Button key={action} onClick={() => setDialog("submit")}>
            {label(action)}
          </Button>
        );
      case "PUBLISH":
        return (
          <CheckedConfirm
            key={action}
            month={month}
            step="publish"
            triggerLabel={label(action)}
            title={t("confirm.publishTitle")}
            description={t("confirm.publishDescription")}
            onConfirm={() => run(() => publish.mutateAsync(), "done.published").catch(() => undefined)}
          />
        );
      case "REVOKE_APPROVAL":
        return (
          <Button key={action} variant="outline" onClick={() => setDialog("revoke")}>
            {label(action)}
          </Button>
        );
      case "CLOSE":
        return (
          <ConfirmDialog
            key={action}
            trigger={<Button variant="outline" />}
            triggerLabel={label(action)}
            title={t("confirm.closeTitle")}
            description={t("confirm.closeDescription")}
            destructive
            onConfirm={() => run(() => close.mutateAsync(), "done.closed").catch(() => undefined)}
          />
        );
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">{actions.map(render)}</div>
      {dialog === "submit" && (
        <NoteDialog
          title={t("submit.title")}
          description={t("submit.description")}
          label={t("submit.note")}
          placeholder={t("submit.notePlaceholder")}
          confirmLabel={label("SUBMIT")}
          month={month}
          checkStep="submit"
          optional
          onClose={() => setDialog(null)}
          onConfirm={(note) => run(() => submit.mutateAsync(note || undefined), "done.submitted")}
        />
      )}
      {dialog === "revoke" && (
        <NoteDialog
          title={t("revoke.title")}
          description={t("revoke.description")}
          label={t("revoke.reason")}
          hint={t("revoke.hint", { min: MIN_REVOKE_REASON })}
          confirmLabel={label("REVOKE_APPROVAL")}
          validate={isValidRevokeReason}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => run(() => revoke.mutateAsync(reason), "done.revoked")}
        />
      )}
    </>
  );
}

type NoteDialogProps = {
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  hint?: string;
  confirmLabel: string;
  /** Có thì hiện hộp kiểm tra của bước này phía trên ô ghi chú; có blocker thì khóa nút xác nhận. */
  month?: string;
  checkStep?: CheckStep;
  /** true: ô ghi chú có thể để trống. */
  optional?: boolean;
  validate?: (value: string) => boolean;
  onClose: () => void;
  onConfirm: (value: string) => Promise<unknown>;
};

function NoteDialog({
  title,
  description,
  label,
  placeholder,
  hint,
  confirmLabel,
  month,
  checkStep,
  optional,
  validate,
  onClose,
  onConfirm,
}: NoteDialogProps) {
  const t = useTranslations("Payroll");
  const checks = useChecks(month ?? "", checkStep ?? "submit", !!month && !!checkStep);
  const blocked = hasBlockers(checks.data);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const trimmed = value.trim();
  const valid = validate ? validate(value) : optional || trimmed.length > 0;

  async function confirm() {
    setPending(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      // Lỗi đã báo bằng toast; giữ hộp thoại để sửa hoặc hủy.
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {month && checkStep && <ChecksBox month={month} checks={checks.data} loading={checks.isPending} />}
        <div className="space-y-1">
          <Label htmlFor="payroll-note">{label}</Label>
          <Textarea
            id="payroll-note"
            rows={3}
            maxLength={500}
            value={value}
            placeholder={placeholder}
            aria-invalid={!optional && value.length > 0 && !valid}
            onChange={(e) => setValue(e.target.value)}
          />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={confirm} disabled={!valid || pending || blocked}>
            {pending && <Spinner />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CheckedConfirmProps = {
  month: string;
  step: CheckStep;
  triggerLabel: string;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
};

/** Hộp xác nhận có hộp kiểm tra phía trên: có blocker thì khóa nút xác nhận; lỗi tải kiểm tra thì không chặn. */
function CheckedConfirm({ month, step, triggerLabel, title, description, onConfirm }: CheckedConfirmProps) {
  const t = useTranslations("Payroll");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const checks = useChecks(month, step, open);
  const blocked = hasBlockers(checks.data);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ChecksBox month={month} checks={checks.data} loading={checks.isPending} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button onClick={confirm} disabled={pending || blocked}>
              {pending && <Spinner />} {triggerLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
