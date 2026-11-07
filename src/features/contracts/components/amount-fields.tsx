"use client";

import { useTranslations } from "next-intl";
import { Controller, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatMoneyInput } from "../money";
import type { AmountsFormValues } from "../schemas";

const FIELDS = ["baseSalary", "lunchAllowance", "otherAllowance", "insuranceSalary"] as const;

type AmountFieldsProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  /** Nhóm chứa 4 ô trong form: `salary` (form hợp đồng) hoặc `amounts` (form mức lương), trùng tên field của DTO. */
  group: "salary" | "amounts";
  idPrefix: string;
};

/**
 * Bốn ô số tiền. Gõ tới đâu tự thêm dấu chấm ngăn cách tới đó để khó nhập nhầm hàng triệu; ô trống có nghĩa riêng:
 * phụ cấp = 0, lương đóng bảo hiểm = lương cơ bản.
 */
export function AmountFields<T extends FieldValues>({ form, group, idPrefix }: AmountFieldsProps<T>) {
  const t = useTranslations("Contracts.Fields");
  // Kiểu generic không suy ra được đường dẫn con: ép về form có đúng nhóm số tiền.
  const typed = form as unknown as UseFormReturn<Record<string, AmountsFormValues>>;
  const errors = typed.formState.errors[group];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((name) => (
        <Controller
          key={name}
          control={typed.control}
          name={`${group}.${name}`}
          render={({ field }) => (
            <Field data-invalid={!!errors?.[name]}>
              <FieldLabel htmlFor={`${idPrefix}-${name}`}>{t(name)}</FieldLabel>
              <Input
                id={`${idPrefix}-${name}`}
                inputMode="numeric"
                autoComplete="off"
                className="tabular-nums"
                aria-invalid={!!errors?.[name]}
                value={field.value}
                onBlur={field.onBlur}
                ref={field.ref}
                onChange={(event) => field.onChange(formatMoneyInput(event.target.value))}
              />
              {name === "insuranceSalary" && <FieldDescription>{t("insuranceHint")}</FieldDescription>}
              {(name === "lunchAllowance" || name === "otherAllowance") && (
                <FieldDescription>{t("allowanceHint")}</FieldDescription>
              )}
              <FieldError errors={[errors?.[name]]} />
            </Field>
          )}
        />
      ))}
    </div>
  );
}
