"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { applyServerFieldErrors } from "@/lib/forms";
import { useCreatePerformanceRate, usePayrollErrorMessage } from "../hooks";
import { PERFORMANCE_RATE_LEVELS, performanceRateSchema } from "../performance-rates";
import type { PerformanceRateLevel, PerformanceRatePosition } from "../types";

type RateSchema = ReturnType<typeof performanceRateSchema>;

export function PerformanceRateDialog({
  positions,
  onClose,
}: {
  positions: PerformanceRatePosition[];
  onClose: () => void;
}) {
  const t = useTranslations("Payroll.performanceRates");
  const common = useTranslations("Common");
  const levelLabel = useTranslations("Employees.levels");
  const errorMessage = usePayrollErrorMessage();
  const create = useCreatePerformanceRate();
  const form = useForm<z.input<RateSchema>, unknown, z.output<RateSchema>>({
    resolver: zodResolver(performanceRateSchema(t)),
    defaultValues: { amount: "", effectiveFrom: "", positionId: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function submit(values: z.output<RateSchema>) {
    try {
      await create.mutateAsync({ ...values, positionId: values.positionId || null });
      toast.success(t("created"));
      onClose();
    } catch (error) {
      if (!applyServerFieldErrors(error, form.setError)) toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="level"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="performance-rate-level">{t("level")}</FieldLabel>
                  <ChoiceSelect
                    id="performance-rate-level"
                    value={field.value ?? ""}
                    onChange={(value) => field.onChange(value as PerformanceRateLevel)}
                    choices={PERFORMANCE_RATE_LEVELS.map((level) => ({ value: level, label: levelLabel(level) }))}
                    placeholder={t("selectLevel")}
                    invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="positionId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="performance-rate-position">{t("position")}</FieldLabel>
                  <ChoiceSelect
                    id="performance-rate-position"
                    value={field.value}
                    onChange={field.onChange}
                    choices={positions.filter((position) => position.active).map((position) => ({
                      value: position.id,
                      label: `${position.code} · ${position.name}`,
                    }))}
                    noneLabel={t("allPositions")}
                    invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="performance-rate-amount">{t("amount")}</FieldLabel>
              <Input
                id="performance-rate-amount"
                inputMode="numeric"
                aria-invalid={!!errors.amount}
                disabled={isSubmitting}
                {...form.register("amount")}
              />
              <FieldError errors={[errors.amount]} />
            </Field>
            <Field data-invalid={!!errors.effectiveFrom}>
              <FieldLabel htmlFor="performance-rate-date">{t("effectiveFrom")}</FieldLabel>
              <Input
                id="performance-rate-date"
                type="date"
                aria-invalid={!!errors.effectiveFrom}
                disabled={isSubmitting}
                {...form.register("effectiveFrom")}
              />
              <FieldError errors={[errors.effectiveFrom]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {common("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
