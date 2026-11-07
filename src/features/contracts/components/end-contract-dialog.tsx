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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors } from "@/lib/forms";
import { getContractError, hasFieldErrors } from "../error-messages";
import { useEndContract, useRefreshContract } from "../hooks";
import { endSchema, toEndRequest, type EndFormValues } from "../schemas";
import type { ContractDetail } from "../types";

const FORM_ID = "contract-end-form";

type EndContractDialogProps = {
  detail: ContractDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Kết thúc sớm hợp đồng đang chạy. Mức lương tương lai sau ngày kết thúc bị xóa. Không hoàn tác được. */
export function EndContractDialog({ detail, open, onOpenChange }: EndContractDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <EndForm detail={detail} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EndForm({ detail, onDone }: { detail: ContractDetail; onDone: () => void }) {
  const t = useTranslations("Contracts.End");
  const tFields = useTranslations("Contracts.Fields");
  const tValidation = useTranslations("Contracts.Validation");
  const tContractErrors = useTranslations("Contracts.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const { contract, version } = detail;
  const refresh = useRefreshContract(contract.id);

  const schema = useMemo(
    () => endSchema(tValidation, contract.startDate, contract.endDate),
    [tValidation, contract.startDate, contract.endDate],
  );
  const form = useForm<EndFormValues>({ resolver: zodResolver(schema), defaultValues: { endDate: "", reason: "" } });
  const mutation = useEndContract(contract.id);

  function submit(values: EndFormValues) {
    mutation.mutate(toEndRequest(values, version), {
      onSuccess: () => {
        toast.success(t("success"));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        if (getContractError(error, tContractErrors, tErrors).stale) void refresh();
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getContractError(mutation.error, tContractErrors, tErrors) : null;
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
          <Field data-invalid={!!errors.endDate}>
            <FieldLabel htmlFor="contract-new-end">{t("newEndDate")}</FieldLabel>
            <Input
              id="contract-new-end"
              type="date"
              min={contract.startDate}
              aria-invalid={!!errors.endDate}
              {...form.register("endDate")}
            />
            <FieldError errors={[errors.endDate]} />
          </Field>
          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="contract-end-reason">{tFields("reason")}</FieldLabel>
            <Textarea id="contract-end-reason" rows={2} aria-invalid={!!errors.reason} {...form.register("reason")} />
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
