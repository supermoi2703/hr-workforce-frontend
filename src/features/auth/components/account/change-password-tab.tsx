"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { changePassword } from "../../api";
import { getChangePasswordError, type LoginNotice } from "../../error-messages";
import { accountKeys } from "../../hooks";
import { createChangePasswordSchema, type ChangePasswordFormValues } from "../../schemas";
import { AuthNotice } from "../auth-form-header";
import { NewPasswordFields } from "../new-password-fields";
import { PasswordInput } from "../password-input";

/**
 * Đổi mật khẩu khi đang đăng nhập. Backend giữ phiên của máy này (nhận ra qua cookie refresh_token),
 * đăng xuất các máy khác và gửi email thông báo.
 */
export function ChangePasswordTab() {
  const t = useTranslations("Account.Password");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");
  const queryClient = useQueryClient();

  const schema = useMemo(() => createChangePasswordSchema(tValidation), [tValidation]);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordFormValues) =>
      changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success(t("success"));
      form.reset();
      // Các thiết bị khác vừa bị đăng xuất: danh sách thiết bị cần tải lại.
      void queryClient.invalidateQueries({ queryKey: accountKeys.sessions });
    },
    onError: (error) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { field, message } = getChangePasswordError(error, tAuthErrors, tErrors);
      if (field) form.setError(field, { type: "server", message }, { shouldFocus: true });
    },
  });

  // Lỗi đã gắn vào ô thì không hiện thêm Alert.
  let notice: LoginNotice | null = null;
  if (mutation.isError && !(isApiError(mutation.error) && mutation.error.fieldErrors.length > 0)) {
    const result = getChangePasswordError(mutation.error, tAuthErrors, tErrors);
    if (!result.field) {
      notice = {
        message: result.message,
        tone: "error",
        // Tài khoản chỉ đăng nhập bằng Google: đặt mật khẩu qua luồng quên mật khẩu (mã gửi tới email).
        action: result.noPassword ? { href: "/forgot-password", label: t("setPassword") } : undefined,
      };
    }
  }

  const { errors } = form.formState;

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <AuthNotice notice={notice} />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.currentPassword}>
            <FieldLabel htmlFor="change-current">{t("current")}</FieldLabel>
            <PasswordInput
              id="change-current"
              autoComplete="current-password"
              className="h-9"
              aria-invalid={!!errors.currentPassword}
              {...form.register("currentPassword")}
            />
            <FieldError errors={[errors.currentPassword]} />
          </Field>

          <NewPasswordFields
            idPrefix="change"
            password={form.register("newPassword")}
            confirm={form.register("confirmPassword")}
            value={newPassword}
            passwordError={errors.newPassword}
            confirmError={errors.confirmPassword}
          />

          <div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner />}
              {t("submit")}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
