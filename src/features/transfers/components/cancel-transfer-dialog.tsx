"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors } from "@/lib/forms";
import { getTransferError, hasFieldErrors } from "../error-messages";
import { useCancelTransfer, useRefreshTransfers } from "../hooks";
import { cancelSchema, toCancelRequest, type CancelFormValues } from "../schemas";

const FORM_ID = "transfer-cancel-form";

type CancelTransferDialogProps = {
  transferId: string | null;
  onClose: () => void;
};

/** Hủy điều chuyển đã duyệt mà chưa tới ngày hiệu lực (employee:manage). Hồ sơ giữ nguyên. */
export function CancelTransferDialog({ transferId, onClose }: CancelTransferDialogProps) {
  return (
    <Dialog open={transferId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {transferId && <CancelForm transferId={transferId} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ transferId, onDone }: { transferId: string; onDone: () => void }) {
  const t = useTranslations("Transfers.Cancel");
  const tFields = useTranslations("Transfers.Fields");
  const tValidation = useTranslations("Transfers.Validation");
  const tTransferErrors = useTranslations("Transfers.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshTransfers();

  const schema = useMemo(() => cancelSchema(tValidation), [tValidation]);
  const form = useForm<CancelFormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });
  const mutation = useCancelTransfer(transferId);

  function submit(values: CancelFormValues) {
    mutation.mutate(toCancelRequest(values), {
      onSuccess: () => {
        toast.success(t("success"));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        if (getTransferError(error, tTransferErrors, tErrors).stale) void refresh();
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getTransferError(mutation.error, tTransferErrors, tErrors) : null;
  const { errors } = form.formState;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="transfer-cancel-reason">{tFields("cancelReason")}</FieldLabel>
            <Textarea id="transfer-cancel-reason" rows={3} aria-invalid={!!errors.reason} {...form.register("reason")} />
            <FieldError errors={[errors.reason]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} variant="destructive" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
