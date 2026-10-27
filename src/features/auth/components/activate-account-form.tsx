"use client";

import { useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { applyServerFieldErrors } from "@/lib/forms";
import { activateAccount, resendActivation } from "../api";
import {
  getCodeFlowAlert,
  getCodeFlowError,
  LOGIN_REASON_ACCOUNT_ACTIVATED,
  type LoginNotice,
} from "../error-messages";
import { useCooldown, useRedirectIfAuthenticated, useSignInWithPassword } from "../hooks";
import { createActivateSchema, createEmailSchema, type ActivateFormValues } from "../schemas";
import { AuthFormHeader, AuthNotice, authLinkClassName } from "./auth-form-header";
import { NewPasswordFields } from "./new-password-fields";
import { OtpField } from "./otp-field";
import { ResendCodeButton } from "./resend-code-button";

/**
 * Kích hoạt tài khoản HR vừa tạo: nhập mã trong email mời + tự đặt mật khẩu → tự đăng nhập.
 * Mở từ link trong email (`?email=`) thì email cố định; không có thì người dùng tự nhập.
 */
export function ActivateAccountForm({ initialEmail }: { initialEmail?: string }) {
  const t = useTranslations("Auth.Activate");
  const tLogin = useTranslations("Auth.Login");
  const tCode = useTranslations("Auth.CodeFlow");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");
  useRedirectIfAuthenticated();
  // Mã đã được gửi kèm email mời nên chưa cần đếm ngược lúc mở trang.
  const cooldown = useCooldown();
  const signInWithPassword = useSignInWithPassword(LOGIN_REASON_ACCOUNT_ACTIVATED);

  // Email trên URL hợp lệ thì cố định (hiện dạng chữ), sai thì cho nhập.
  const fixedEmail = useMemo(
    () =>
      initialEmail && createEmailSchema(tValidation).safeParse({ email: initialEmail }).success ? initialEmail : null,
    [initialEmail, tValidation],
  );

  const schema = useMemo(() => createActivateSchema(tValidation), [tValidation]);
  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: fixedEmail ?? "", otp: "", password: "", confirmPassword: "" },
  });
  // Giá trị đang gõ, để tích danh sách yêu cầu mật khẩu (useWatch thay cho form.watch: hợp với React Compiler).
  const password = useWatch({ control: form.control, name: "password" });

  const mutation = useMutation({
    // Kích hoạt xong đăng nhập luôn; nút giữ trạng thái đang xử lý tới khi chuyển trang.
    mutationFn: async ({ email, otp, password }: ActivateFormValues) => {
      await activateAccount({ email, otp, password });
      await signInWithPassword(email, password);
    },
    onError: (error) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { field, message } = getCodeFlowError(error, tAuthErrors, tErrors);
      if (field) form.setError(field === "otp" ? "otp" : "password", { type: "server", message }, { shouldFocus: true });
    },
  });

  // Gửi lại mã cần email hợp lệ: kiểm tra ô email trước (khi email không cố định).
  async function resend(): Promise<boolean> {
    if (!(await form.trigger("email"))) return false;
    await resendActivation(form.getValues("email"));
    return true;
  }

  const alert = getCodeFlowAlert(mutation.error, tAuthErrors, tErrors);
  const notice: LoginNotice | null = alert ? { message: alert, tone: "error" } : null;
  const { errors } = form.formState;
  const submitting = mutation.isPending || mutation.isSuccess;

  return (
    <div className="flex flex-col gap-6">
      <AuthFormHeader
        title={t("title")}
        description={fixedEmail ? t("descriptionFor", { email: fixedEmail }) : t("description")}
      />
      <AuthNotice notice={notice} />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FieldGroup className="gap-4">
          {!fixedEmail && (
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="activate-email">{tLogin("email")}</FieldLabel>
              <Input
                id="activate-email"
                type="email"
                autoComplete="email"
                placeholder={tLogin("emailPlaceholder")}
                className="h-9"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
          )}

          <Field data-invalid={!!errors.otp}>
            <div className="flex items-center">
              <FieldLabel htmlFor="activate-otp">{tCode("code")}</FieldLabel>
              <span className="ml-auto">
                <ResendCodeButton cooldown={cooldown} onResend={resend} />
              </span>
            </div>
            <Controller
              control={form.control}
              name="otp"
              render={({ field }) => (
                <OtpField
                  id="activate-otp"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.otp}
                />
              )}
            />
            <FieldError errors={[errors.otp]} />
          </Field>

          <NewPasswordFields
            idPrefix="activate"
            password={form.register("password")}
            confirm={form.register("confirmPassword")}
            value={password}
            passwordError={errors.password}
            confirmError={errors.confirmPassword}
          />

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting && <Spinner />}
            {t("submit")}
          </Button>
        </FieldGroup>
      </form>

      <Link href="/login" className={`${authLinkClassName} w-fit`}>
        {tCode("backToSignIn")}
      </Link>
    </div>
  );
}
