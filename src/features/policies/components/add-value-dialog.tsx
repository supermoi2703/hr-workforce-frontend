"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, formatNumber, todayIsoDate } from "@/lib/format";
import { getPolicyError } from "../error-messages";
import { useAddPolicyValue, useFormatPolicyValue, useOffices, usePolicyLabels } from "../hooks";
import { COMPANY_SCOPE, policyValueSchema, toApiValue, type PolicyValueFormValues } from "../schemas";
import type { PolicyDetail } from "../types";
import { findSameDay, formatRange, groupValues, parseIsoDuration } from "../values";
import { PolicyValueInput } from "./policy-value-input";

const FORM_ID = "add-policy-value-form";

type AddValueDialogProps = {
  policy: PolicyDetail;
  /** Kiểu dùng để nhập (effectiveValueType). */
  valueType: string;
  /** null = đóng; COMPANY_SCOPE hoặc id văn phòng = mở với phạm vi đó chọn sẵn. */
  scope: string | null;
  onClose: () => void;
};

/** Giá trị đang áp dụng của một phạm vi → giá trị ban đầu của form (để chỉ cần sửa con số). */
function initialValues(policy: PolicyDetail, valueType: string, scope: string, today: string): PolicyValueFormValues {
  const groups = groupValues(policy.values, today);
  const scoped = scope === COMPANY_SCOPE ? groups.company : groups.offices.find((g) => g.officeId === scope)?.values;
  const current = (scoped ?? groups.company).find((v) => v.status === "current")?.value ?? "";
  if (valueType === "DURATION") {
    const duration = parseIsoDuration(current);
    return { scope, value: duration ? String(duration.amount) : "", unit: duration?.unit ?? "MINUTES", validFrom: today };
  }
  return { scope, value: current, unit: "MINUTES", validFrom: today };
}

/**
 * Thêm một giá trị có ngày hiệu lực (từ hôm nay trở đi). Giá trị cũ giữ nguyên trong lịch sử. Báo trước khi giá trị mới
 * sẽ ghi đè một giá trị đã hẹn cùng ngày, hoặc trùng ngày với giá trị đang áp dụng (backend từ chối).
 */
export function AddValueDialog({ policy, valueType, scope, onClose }: AddValueDialogProps) {
  const t = useTranslations("Policies.Add");
  const tValidation = useTranslations("Policies.Validation");
  const tScope = useTranslations("Policies.scope");
  const tPolicyErrors = useTranslations("Policies.errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const labels = usePolicyLabels();
  const formatValue = useFormatPolicyValue();
  const offices = useOffices();
  const mutation = useAddPolicyValue(policy.key);
  const [today] = useState(todayIsoDate);

  const schema = useMemo(() => policyValueSchema(tValidation, { ...policy, valueType }, today), [tValidation, policy, valueType, today]);
  const initial = useMemo(
    () => (scope ? initialValues(policy, valueType, scope, today) : undefined),
    [policy, valueType, scope, today],
  );
  // `values`: mở với phạm vi khác thì form nhận giá trị ban đầu mới (RHF so sâu nên tải lại dữ liệu y hệt không xóa chữ đang gõ)
  const form = useForm<PolicyValueFormValues>({ resolver: zodResolver(schema), values: initial });
  const [chosenScope, validFrom, unit] = useWatch({ control: form.control, name: ["scope", "validFrom", "unit"] });

  const officeId = chosenScope === COMPANY_SCOPE ? null : (chosenScope ?? null);
  const sameDay = validFrom ? findSameDay(policy.values, officeId, validFrom) : undefined;
  // Ngày hiệu lực không ở quá khứ, nên trùng ngày với giá trị đã có hiệu lực chỉ xảy ra khi chọn hôm nay
  const conflict = sameDay && sameDay.validFrom <= today;

  const scopeItems = useMemo(() => {
    const items: Record<string, string> = { [COMPANY_SCOPE]: tScope("company") };
    for (const office of offices.data ?? []) {
      // Văn phòng ngừng hoạt động không nhận giá trị mới; vẫn giữ nếu đang mở đúng văn phòng đó
      if (office.active || office.id === scope) items[office.id] = office.name;
    }
    return items;
  }, [offices.data, scope, tScope]);

  function close() {
    form.reset(initial);
    mutation.reset();
    onClose();
  }

  async function submit(values: PolicyValueFormValues) {
    try {
      await mutation.mutateAsync({
        officeId: values.scope === COMPANY_SCOPE ? null : values.scope,
        value: toApiValue(valueType, values),
        validFrom: values.validFrom,
      });
      toast.success(t("success"));
      close();
    } catch {
      // Hiện Alert bên dưới, giữ hộp thoại mở để sửa và thử lại.
    }
  }

  const { errors } = form.formState;
  const range = valueType === "INTEGER" || valueType === "DECIMAL" ? formatRange(policy.minValue, policy.maxValue, formatNumber) : null;
  const formError = mutation.isError ? getPolicyError(mutation.error, tPolicyErrors, tErrors) : null;

  return (
    <Dialog open={scope !== null} onOpenChange={(open) => !open && !mutation.isPending && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name: labels.name(policy.key) })}</DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup className="gap-4">
            {policy.officeOverridable && (
              <Controller
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="policy-scope">{t("scope")}</FieldLabel>
                    <Select value={field.value} onValueChange={(next) => field.onChange(String(next))} items={scopeItems}>
                      <SelectTrigger id="policy-scope" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(scopeItems).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>{t("scopeHint")}</FieldDescription>
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="value"
              render={({ field }) => (
                <Field data-invalid={!!errors.value}>
                  <FieldLabel htmlFor="policy-value">{t("value")}</FieldLabel>
                  <PolicyValueInput
                    id="policy-value"
                    valueType={valueType}
                    value={field.value}
                    onChange={field.onChange}
                    unit={unit}
                    onUnitChange={(unit) => form.setValue("unit", unit)}
                    invalid={!!errors.value}
                  />
                  {range && <FieldDescription>{t("range", { range })}</FieldDescription>}
                  {valueType === "TIME" && <FieldDescription>{t("timeHint")}</FieldDescription>}
                  <FieldError errors={[errors.value]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="validFrom"
              render={({ field }) => (
                <Field data-invalid={!!errors.validFrom}>
                  <FieldLabel htmlFor="policy-valid-from">{t("validFrom")}</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={<Button id="policy-valid-from" variant="outline" className="w-full justify-start font-normal sm:w-60" />}
                      aria-invalid={!!errors.validFrom}
                    >
                      <CalendarIcon className="text-muted-foreground" />
                      {field.value ? formatDate(field.value) : t("chooseDate")}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={(date) => date && field.onChange(format(date, "yyyy-MM-dd"))}
                        disabled={{ before: parseISO(today) }}
                        defaultMonth={field.value ? parseISO(field.value) : parseISO(today)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>{t("validFromHint")}</FieldDescription>
                  <FieldError errors={[errors.validFrom]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        {sameDay && (
          <Alert variant={conflict ? "destructive" : "default"}>
            <TriangleAlertIcon />
            <AlertDescription>
              {conflict
                ? t("conflict")
                : t("replaces", { value: formatValue(valueType, sameDay.value), date: formatDate(sameDay.validFrom) })}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} disabled={mutation.isPending}>
            {tCommon("cancel")}
          </DialogClose>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending || !!conflict}>
            {mutation.isPending && <Spinner />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
