"use client";

import { useMemo, useState } from "react";
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
import { forgotPassword, resetPassword } from "../api";
import {
  getCodeFlowAlert,
  getCodeFlowError,
  LOGIN_REASON_PASSWORD_RESET,
  type LoginNotice,
} from "../error-messages";
import { useCooldown, useRedirectIfAuthenticated, useSignInWithPassword } from "../hooks";
import {
  createEmailSchema,
  createResetPasswordSchema,
  type EmailFormValues,
  type ResetPasswordFormValues,
} from "../schemas";
import { AuthFormHeader, AuthNotice, authLinkClassName } from "./auth-form-header";
import { NewPasswordFields } from "./new-password-fields";
import { OtpField } from "./otp-field";
import { ResendCodeButton } from "./resend-code-button";

type Cooldown = ReturnType<typeof useCooldown>;

/**
 * Quên mật khẩu, 2 bước trên cùng trang: (1) nhập email → gửi mã; (2) nhập mã + mật khẩu mới → tự đăng nhập.
 * Mở từ link trong email (`?email=`) thì vào thẳng bước 2 vì người dùng đã có mã.
 */
export function ForgotPasswordFlow({ initialEmail }: { initialEmail?: string }) {
  const tValidation = useTranslations("Auth.Validation");
  useRedirectIfAuthenticated();
  const cooldown = useCooldown();

  // Chỉ vào thẳng bước 2 khi email trên URL hợp lệ; sai thì bắt đầu từ bước 1.
  const [email, setEmail] = useState<string | null>(() =>
    initialEmail && createEmailSchema(tValidation).safeParse({ email: initialEmail }).success ? initialEmail : null,
  );
  const [justSent, setJustSent] = useState(false);

  if (!email) {
    return (
      <RequestCodeStep
        onSent={(sentTo) => {
          setEmail(sentTo);
          setJustSent(true);
          cooldown.start();
        }}
      />
    );
  }
  return (
    <ResetPasswordStep
      email={email}
      justSent={justSent}
      cooldown={cooldown}
      onChangeEmail={() => {
        setEmail(null);
        setJustSent(false);
      }}
    />
  );
}

function RequestCodeStep({ onSent }: { onSent: (email: string) => void }) {
  const t = useTranslations("Auth.ForgotPassword");
  const tLogin = useTranslations("Auth.Login");
  const tCode = useTranslations("Auth.CodeFlow");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");

  const schema = useMemo(() => createEmailSchema(tValidation), [tValidation]);
  const form = useForm<EmailFormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const mutation = useMutation({
    mutationFn: ({ email }: EmailFormValues) => forgotPassword(email),
    // Backend luôn trả 200 (không lộ email nào có tài khoản) → luôn sang bước nhập mã.
    onSuccess: (_, { email }) => onSent(email),
    onError: (error) => applyServerFieldErrors(error, form.setError),
  });

  const alert = getCodeFlowAlert(mutation.error, tAuthErrors, tErrors);
  const notice: LoginNotice | null = alert ? { message: alert, tone: "error" } : null;
  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-6">
      <AuthFormHeader title={t("title")} description={t("requestDescription")} />
      <AuthNotice notice={notice} />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="forgot-email">{tLogin("email")}</FieldLabel>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={tLogin("emailPlaceholder")}
              className="h-9"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {t("sendCode")}
          </Button>
        </FieldGroup>
      </form>

      <Link href="/login" className={`${authLinkClassName} w-fit`}>
        {tCode("backToSignIn")}
      </Link>
    </div>
  );
}

type ResetPasswordStepProps = {
  email: string;
  /** Vừa gửi mã ở bước 1 (hiện thông báo "đã gửi mã"). */
  justSent: boolean;
  cooldown: Cooldown;
  onChangeEmail: () => void;
};

function ResetPasswordStep({ email, justSent, cooldown, onChangeEmail }: ResetPasswordStepProps) {
  const t = useTranslations("Auth.ForgotPassword");
  const tCode = useTranslations("Auth.CodeFlow");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");
  const signInWithPassword = useSignInWithPassword(LOGIN_REASON_PASSWORD_RESET);

  const schema = useMemo(() => createResetPasswordSchema(tValidation), [tValidation]);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });
  // Giá trị đang gõ, để tích danh sách yêu cầu mật khẩu (useWatch thay cho form.watch: hợp với React Compiler).
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  const mutation = useMutation({
    // Đặt lại xong đăng nhập luôn; nút giữ trạng thái đang xử lý tới khi chuyển trang.
    mutationFn: async ({ otp, newPassword }: ResetPasswordFormValues) => {
      await resetPassword({ email, otp, newPassword });
      await signInWithPassword(email, newPassword);
    },
    onError: (error) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { field, message } = getCodeFlowError(error, tAuthErrors, tErrors);
      if (field) form.setError(field === "otp" ? "otp" : "newPassword", { type: "server", message }, { shouldFocus: true });
    },
  });

  const alert = getCodeFlowAlert(mutation.error, tAuthErrors, tErrors);
  let notice: LoginNotice | null = null;
  if (alert) notice = { message: alert, tone: "error" };
  else if (justSent && mutation.status === "idle") notice = { message: t("codeSent", { email }), tone: "info" };

  const { errors } = form.formState;
  const submitting = mutation.isPending || mutation.isSuccess;

  return (
    <div className="flex flex-col gap-6">
      <AuthFormHeader title={t("title")} description={t("resetDescription", { email })} />
      <AuthNotice notice={notice} />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.otp}>
            <div className="flex items-center">
              <FieldLabel htmlFor="reset-otp">{tCode("code")}</FieldLabel>
              <span className="ml-auto">
                <ResendCodeButton
                  cooldown={cooldown}
                  onResend={async () => {
                    await forgotPassword(email);
                    return true;
                  }}
                />
              </span>
            </div>
            <Controller
              control={form.control}
              name="otp"
              render={({ field }) => (
                <OtpField
                  id="reset-otp"
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
            idPrefix="reset"
            password={form.register("newPassword")}
            confirm={form.register("confirmPassword")}
            value={newPassword}
            passwordError={errors.newPassword}
            confirmError={errors.confirmPassword}
          />

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting && <Spinner />}
            {t("submit")}
          </Button>
        </FieldGroup>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onChangeEmail} className={authLinkClassName}>
          {tCode("changeEmail")}
        </button>
        <Link href="/login" className={authLinkClassName}>
          {tCode("backToSignIn")}
        </Link>
      </div>
    </div>
  );
}
