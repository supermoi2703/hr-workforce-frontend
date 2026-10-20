"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldError as FormFieldError, UseFormRegisterReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { checkPassword, type PasswordChecks } from "../password-policy";
import { PasswordInput } from "./password-input";

type NewPasswordFieldsProps = {
  idPrefix: string;
  /** `form.register("newPassword")` hoặc `form.register("password")` (tên khớp DTO backend). */
  password: UseFormRegisterReturn;
  confirm: UseFormRegisterReturn;
  /** Giá trị hiện tại (`form.watch(...)`) để tích danh sách yêu cầu khi gõ. */
  value: string;
  passwordError?: FormFieldError;
  confirmError?: FormFieldError;
};

const RULES: (keyof PasswordChecks)[] = ["length", "letter", "digit"];

/** Ô mật khẩu mới + danh sách yêu cầu tự tích (khớp PasswordPolicy backend) + ô nhập lại. */
export function NewPasswordFields({ idPrefix, password, confirm, value, passwordError, confirmError }: NewPasswordFieldsProps) {
  const t = useTranslations("Auth.CodeFlow");
  const tRules = useTranslations("Auth.PasswordRules");
  const checks = checkPassword(value);
  const rulesId = `${idPrefix}-rules`;

  return (
    <>
      <Field data-invalid={!!passwordError}>
        <FieldLabel htmlFor={`${idPrefix}-password`}>{t("newPassword")}</FieldLabel>
        <PasswordInput
          id={`${idPrefix}-password`}
          autoComplete="new-password"
          className="h-9"
          aria-invalid={!!passwordError}
          aria-describedby={rulesId}
          {...password}
        />
        <FieldError errors={[passwordError]} />
        <div id={rulesId} className="text-sm text-muted-foreground">
          <p>{tRules("title")}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {RULES.map((rule) => (
              <li key={rule} className={cn("flex items-center gap-2", checks[rule] && "text-success")}>
                {checks[rule] ? (
                  <CheckIcon className="size-3.5" aria-hidden />
                ) : (
                  <CircleIcon className="size-3.5" aria-hidden />
                )}
                {tRules(rule)}
              </li>
            ))}
          </ul>
        </div>
      </Field>

      <Field data-invalid={!!confirmError}>
        <FieldLabel htmlFor={`${idPrefix}-confirm`}>{t("confirmPassword")}</FieldLabel>
        <PasswordInput
          id={`${idPrefix}-confirm`}
          autoComplete="new-password"
          className="h-9"
          aria-invalid={!!confirmError}
          {...confirm}
        />
        <FieldError errors={[confirmError]} />
      </Field>
    </>
  );
}
