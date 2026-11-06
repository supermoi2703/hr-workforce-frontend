"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { applyServerFieldErrors } from "@/lib/forms";
import { todayIsoDate } from "@/lib/format";
import { getContractError, hasFieldErrors } from "../error-messages";
import { useCreateContract, useRefreshContract, useUpdateContract } from "../hooks";
import { currentSalary, renewalDefaults } from "../rules";
import {
  amountsToForm,
  contractSchema,
  EMPTY_AMOUNTS,
  toCreateRequest,
  toUpdateRequest,
  type ContractFormValues,
} from "../schemas";
import { CONTRACT_TYPES, type ContractDetail } from "../types";
import { AmountFields } from "./amount-fields";

const FORM_ID = "contract-form";

export type ContractFormMode =
  /** Tạo mới từ hồ sơ: có sẵn ngày vào làm để kiểm tra ngay. */
  | { kind: "create"; employeeId: string; hireDate: string }
  /** Sửa hợp đồng chưa bắt đầu. */
  | { kind: "edit"; detail: ContractDetail }
  /** Tạo hợp đồng nối tiếp, điền sẵn từ hợp đồng này. */
  | { kind: "renew"; detail: ContractDetail };

type ContractFormDialogProps = {
  mode: ContractFormMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Tạo / sửa / gia hạn hợp đồng (contract:manage). Mức lương trong form là mức đầu tiên, áp dụng từ ngày bắt đầu. */
export function ContractFormDialog({ mode, open, onOpenChange }: ContractFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* Nội dung chỉ dựng khi mở: mỗi lần mở lấy lại giá trị mới nhất. */}
        {open && <ContractForm mode={mode} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function toForm(mode: ContractFormMode): ContractFormValues {
  if (mode.kind === "create") {
    return { contractNumber: "", type: "", startDate: "", endDate: "", salary: EMPTY_AMOUNTS };
  }
  const today = todayIsoDate();
  if (mode.kind === "renew") {
    const defaults = renewalDefaults(mode.detail, today);
    return {
      contractNumber: "",
      type: defaults.type,
      startDate: defaults.startDate,
      endDate: "",
      salary: amountsToForm(defaults.salary),
    };
  }
  const { contract, salaries } = mode.detail;
  // Hợp đồng chưa bắt đầu: mức đầu tiên là mức có ngày hiệu lực = ngày bắt đầu.
  const first = salaries.find((salary) => salary.effectiveFrom === contract.startDate) ?? currentSalary(salaries, today);
  return {
    contractNumber: contract.contractNumber,
    type: contract.type,
    startDate: contract.startDate,
    endDate: contract.endDate ?? "",
    salary: amountsToForm(first),
  };
}

function ContractForm({ mode, onDone }: { mode: ContractFormMode; onDone: () => void }) {
  const t = useTranslations("Contracts.Form");
  const tFields = useTranslations("Contracts.Fields");
  const tType = useTranslations("Contracts.types");
  const tValidation = useTranslations("Contracts.Validation");
  const tContractErrors = useTranslations("Contracts.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const hireDate = mode.kind === "create" ? mode.hireDate : undefined;
  const contractId = mode.kind === "create" ? "" : mode.detail.contract.id;
  const refresh = useRefreshContract(contractId);

  const schema = useMemo(() => contractSchema(tValidation, hireDate), [tValidation, hireDate]);
  const form = useForm<ContractFormValues>({ resolver: zodResolver(schema), defaultValues: toForm(mode) });
  const create = useCreateContract();
  const update = useUpdateContract(contractId);
  const mutation = mode.kind === "edit" ? update : create;
  const type = useWatch({ control: form.control, name: "type" });

  function submit(values: ContractFormValues) {
    const onError = (error: unknown) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { field, message, stale } = getContractError(error, tContractErrors, tErrors);
      if (field === "contractNumber") form.setError(field, { type: "server", message }, { shouldFocus: true });
      if (stale) void refresh();
    };
    if (mode.kind === "edit") {
      update.mutate(toUpdateRequest(values, mode.detail.version), {
        onError,
        onSuccess: () => {
          toast.success(t("saved"));
          onDone();
        },
      });
      return;
    }
    const employeeId = mode.kind === "create" ? mode.employeeId : mode.detail.contract.employeeId;
    create.mutate(toCreateRequest(values, employeeId), {
      onError,
      onSuccess: (created) => {
        toast.success(t("created", { number: created.contract.contractNumber }));
        onDone();
        router.push(`/contracts/${created.contract.id}`);
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getContractError(mutation.error, tContractErrors, tErrors) : null;
  const { errors } = form.formState;
  const typeChoices = CONTRACT_TYPES.map((value) => ({ value, label: tType(value) }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(`${mode.kind}Title`)}</DialogTitle>
        <DialogDescription>{t(`${mode.kind}Description`)}</DialogDescription>
      </DialogHeader>

      {formError && !formError.field && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-6">
        <FieldSet>
          <FieldLegend>{t("contract")}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.contractNumber}>
              <FieldLabel htmlFor="contract-number">{tFields("contractNumber")}</FieldLabel>
              <Input
                id="contract-number"
                autoComplete="off"
                aria-invalid={!!errors.contractNumber}
                {...form.register("contractNumber")}
              />
              <FieldError errors={[errors.contractNumber]} />
            </Field>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field data-invalid={!!errors.type}>
                  <FieldLabel htmlFor="contract-type">{tFields("type")}</FieldLabel>
                  <ChoiceSelect
                    id="contract-type"
                    value={field.value}
                    onChange={field.onChange}
                    choices={typeChoices}
                    placeholder={t("choose")}
                    invalid={!!errors.type}
                  />
                  <FieldError errors={[errors.type]} />
                </Field>
              )}
            />
            <Field data-invalid={!!errors.startDate}>
              <FieldLabel htmlFor="contract-start">{tFields("startDate")}</FieldLabel>
              <Input
                id="contract-start"
                type="date"
                min={hireDate}
                aria-invalid={!!errors.startDate}
                {...form.register("startDate")}
              />
              <FieldError errors={[errors.startDate]} />
            </Field>
            {type !== "INDEFINITE" && (
              <Field data-invalid={!!errors.endDate}>
                <FieldLabel htmlFor="contract-end">{tFields("endDate")}</FieldLabel>
                <Input id="contract-end" type="date" aria-invalid={!!errors.endDate} {...form.register("endDate")} />
                <FieldError errors={[errors.endDate]} />
              </Field>
            )}
          </div>
        </FieldSet>

        <Separator />

        <FieldSet>
          <FieldLegend>{t("salary")}</FieldLegend>
          <AmountFields form={form} group="salary" idPrefix="contract" />
        </FieldSet>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {mode.kind === "edit" ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </>
  );
}
