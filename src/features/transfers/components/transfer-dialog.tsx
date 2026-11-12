"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect, type Choice } from "@/components/shared/choice-select";
import { applyServerFieldErrors } from "@/lib/forms";
import { todayIsoDate } from "@/lib/format";
import { getTransferError, hasFieldErrors } from "../error-messages";
import { useCreateTransfer, useRefreshTransfers } from "../hooks";
import { hasUnitChange, teamsOf, unitChoices, unitName } from "../rules";
import { toTransferRequest, transferSchema, type TransferFormValues } from "../schemas";
import { UNIT_HEAD_WARNING, type OrgOptions, type TransferEmployee, type UnitOption } from "../types";

const FORM_ID = "transfer-form";

type TransferDialogProps = {
  employee: TransferEmployee;
  org: OrgOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Đề xuất điều chuyển (employee:transfer). Form điền sẵn đơn vị hiện tại: đổi thứ nào thì thứ đó thay đổi, phải đổi ít
 * nhất một thứ. Hồ sơ chỉ đổi khi duyệt xong và tới ngày hiệu lực.
 */
export function TransferDialog({ employee, org, open, onOpenChange }: TransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {/* Nội dung chỉ dựng khi mở: mỗi lần mở điền lại đơn vị hiện tại mới nhất. */}
        {open && <TransferForm employee={employee} org={org} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TransferForm({ employee, org, onDone }: { employee: TransferEmployee; org: OrgOptions; onDone: () => void }) {
  const t = useTranslations("Transfers.Form");
  const tFields = useTranslations("Transfers.Fields");
  const tValidation = useTranslations("Transfers.Validation");
  const tTransferErrors = useTranslations("Transfers.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshTransfers();
  const today = todayIsoDate();

  const schema = useMemo(() => transferSchema(tValidation, today), [tValidation, today]);
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      officeId: employee.officeId,
      departmentId: employee.departmentId,
      teamId: employee.teamId ?? "",
      positionId: employee.positionId,
      effectiveDate: today,
      reason: "",
    },
  });
  const mutation = useCreateTransfer();

  const [officeId, departmentId, teamId, positionId] = useWatch({
    control: form.control,
    name: ["officeId", "departmentId", "teamId", "positionId"],
  });
  const changed = hasUnitChange(employee, { officeId, departmentId, teamId, positionId });

  const inactive = (unit: UnitOption) => (unit.active ? unit.name : t("inactiveOption", { name: unit.name }));
  const choices = (units: UnitOption[] | undefined, current?: string | null): Choice[] =>
    unitChoices(units, current).map((unit) => ({ value: unit.id, label: inactive(unit) }));
  const officeChoices = choices(org.offices, employee.officeId);
  const departmentChoices = choices(org.departments, employee.departmentId);
  const teamChoices = choices(teamsOf(org.teams, departmentId), employee.teamId);
  const positionChoices = choices(org.positions, employee.positionId);

  function submit(values: TransferFormValues) {
    mutation.mutate(toTransferRequest(employee.id, values), {
      onSuccess: (created) => {
        toast.success(t("sent"));
        // Người đang là trưởng phòng / trưởng team mà rời đơn vị: nhắc HR gán trưởng mới.
        if (created.warnings.includes(UNIT_HEAD_WARNING)) toast.warning(t("unitHeadWarning", { name: employee.fullName }));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        const { field, message, stale } = getTransferError(error, tTransferErrors, tErrors);
        if (field) form.setError(field as Path<TransferFormValues>, { type: "server", message }, { shouldFocus: true });
        if (stale) {
          toast.error(message);
          void refresh();
          onDone();
        }
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getTransferError(mutation.error, tTransferErrors, tErrors) : null;
  const { errors } = form.formState;

  const select = (
    name: "officeId" | "departmentId" | "teamId" | "positionId",
    label: string,
    list: Choice[],
    extra?: { noneLabel?: string; onChange?: (value: string) => void },
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field data-invalid={!!errors[name]}>
          <FieldLabel htmlFor={`transfer-${name}`}>{label}</FieldLabel>
          <ChoiceSelect
            id={`transfer-${name}`}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              extra?.onChange?.(value);
            }}
            choices={list}
            placeholder={t("choose")}
            noneLabel={extra?.noneLabel}
            invalid={!!errors[name]}
            disabled={org.isPending}
          />
          <FieldError errors={[errors[name]]} />
        </Field>
      )}
    />
  );

  const current = [
    unitName(org.offices, employee.officeId),
    unitName(org.departments, employee.departmentId),
    employee.teamId ? unitName(org.teams, employee.teamId) : t("noTeam"),
    unitName(org.positions, employee.positionId),
  ].join(" · ");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title", { name: employee.fullName })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {formError && !formError.field && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        {t("current")} <span className="font-medium text-foreground">{current}</span>
      </p>

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {select("officeId", tFields("office"), officeChoices)}
            {select("positionId", tFields("position"), positionChoices)}
            {select("departmentId", tFields("department"), departmentChoices, {
              // Team phải thuộc phòng: đổi phòng thì bỏ team đang chọn.
              onChange: () => form.setValue("teamId", ""),
            })}
            {select("teamId", tFields("team"), teamChoices, { noneLabel: t("noTeam") })}
          </div>
          <Field data-invalid={!!errors.effectiveDate}>
            <FieldLabel htmlFor="transfer-effective-date">{tFields("effectiveDate")}</FieldLabel>
            <Input
              id="transfer-effective-date"
              type="date"
              min={today}
              aria-invalid={!!errors.effectiveDate}
              {...form.register("effectiveDate")}
            />
            <FieldDescription>{t("effectiveDateHint")}</FieldDescription>
            <FieldError errors={[errors.effectiveDate]} />
          </Field>
          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="transfer-reason">{tFields("reason")}</FieldLabel>
            <Textarea id="transfer-reason" rows={3} aria-invalid={!!errors.reason} {...form.register("reason")} />
            <FieldError errors={[errors.reason]} />
          </Field>
        </FieldGroup>
      </form>

      {!changed && <p className="text-sm text-muted-foreground">{t("noChangeHint")}</p>}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending || !changed}>
          {mutation.isPending && <Spinner />}
          {t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
