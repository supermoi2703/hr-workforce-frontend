"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
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
import { todayIsoDate } from "@/lib/format";
import { getContractError, hasFieldErrors } from "../error-messages";
import { useRefreshContract, useSaveSalary } from "../hooks";
import { minSalaryDate } from "../rules";
import { amountsToForm, EMPTY_AMOUNTS, salarySchema, toSalaryRequest, type SalaryFormValues } from "../schemas";
import type { ContractListItem, Salary } from "../types";
import { AmountFields } from "./amount-fields";

const FORM_ID = "contract-salary-form";

type SalaryDialogProps = {
  contract: ContractListItem;
  /** Có = sửa mức tương lai này; không = thêm mức mới. */
  salary?: Salary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Thêm / sửa mức lương. Mức đã có hiệu lực là bất biến: sai thì thêm mức mới cùng ngày kèm lý do, mức sau thắng.
 * Sửa chỉ áp dụng cho mức ở tương lai và ngày mới cũng phải ở tương lai.
 */
export function SalaryDialog({ contract, salary, open, onOpenChange }: SalaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {open && <SalaryForm contract={contract} salary={salary} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SalaryForm({
  contract,
  salary,
  onDone,
}: {
  contract: ContractListItem;
  salary?: Salary;
  onDone: () => void;
}) {
  const t = useTranslations("Contracts.Salary");
  const tFields = useTranslations("Contracts.Fields");
  const tValidation = useTranslations("Contracts.Validation");
  const tContractErrors = useTranslations("Contracts.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const today = todayIsoDate();
  const refresh = useRefreshContract(contract.id);

  const min = minSalaryDate(contract);
  const schema = useMemo(
    () => salarySchema(tValidation, { min, max: contract.endDate }, today),
    [tValidation, min, contract.endDate, today],
  );
  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      effectiveFrom: salary?.effectiveFrom ?? "",
      amounts: salary ? amountsToForm(salary) : EMPTY_AMOUNTS,
      reason: salary?.reason ?? "",
    },
  });
  const mutation = useSaveSalary(contract.id, salary?.id);
  const effectiveFrom = useWatch({ control: form.control, name: "effectiveFrom" });
  const inEffect = effectiveFrom !== "" && effectiveFrom <= today;

  function submit(values: SalaryFormValues) {
    mutation.mutate(toSalaryRequest(values), {
      onSuccess: () => {
        toast.success(t("saved"));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        const { field, message, stale } = getContractError(error, tContractErrors, tErrors);
        if (field === "effectiveFrom") form.setError(field, { type: "server", message }, { shouldFocus: true });
        if (stale) void refresh();
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getContractError(mutation.error, tContractErrors, tErrors) : null;
  const { errors } = form.formState;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{salary ? t("editTitle") : t("addTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {formError && !formError.field && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.effectiveFrom} className="sm:max-w-xs">
            <FieldLabel htmlFor="salary-effective">{tFields("effectiveFrom")}</FieldLabel>
            <Input
              id="salary-effective"
              type="date"
              min={min}
              max={contract.endDate ?? undefined}
              aria-invalid={!!errors.effectiveFrom}
              {...form.register("effectiveFrom")}
            />
            <FieldError errors={[errors.effectiveFrom]} />
          </Field>

          <AmountFields form={form} group="amounts" idPrefix="salary" />

          {inEffect && (
            <Alert>
              <InfoIcon />
              <AlertDescription>{t("inEffectHint")}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="salary-reason">{tFields("reason")}</FieldLabel>
            <Textarea id="salary-reason" rows={2} aria-invalid={!!errors.reason} {...form.register("reason")} />
            <FieldError errors={[errors.reason]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
