"use client";

import { useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { useAuthActions } from "@/lib/auth/auth-provider";
import { applyServerFieldErrors } from "@/lib/forms";
import { login } from "../api";
import {
  getGoogleErrorMessage,
  getLoginErrorMessage,
  getSessionEndNotice,
  type LoginNotice,
} from "../error-messages";
import { useRedirectIfAuthenticated } from "../hooks";
import { createEmailSchema, createLoginSchema, type LoginFormValues } from "../schemas";
import { AuthFormHeader, AuthNotice, authLinkClassName } from "./auth-form-header";
import { GoogleSignInButton } from "./google-sign-in-button";
import { PasswordInput } from "./password-input";

type LoginFormProps = {
  /** `?next=`: trang đang mở trước khi bị chuyển về đăng nhập. */
  next?: string;
  /** `?error=`: mã lỗi backend gắn lên URL khi đăng nhập Google thất bại. */
  googleError?: string;
  /** `?reason=`: vì sao phải đăng nhập (phiên hết hạn, tài khoản bị khóa, vừa đặt lại mật khẩu...). */
  reason?: string;
  /** `?email=`: điền sẵn email (sau khi đặt lại mật khẩu / kích hoạt). */
  initialEmail?: string;
};

export function LoginForm({ next, googleError, reason, initialEmail }: LoginFormProps) {
  const t = useTranslations("Auth.Login");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");
  const { signIn } = useAuthActions();
  useRedirectIfAuthenticated(next);

  // Tạo lại schema khi đổi ngôn ngữ để câu báo lỗi của lần kiểm tra sau theo ngôn ngữ mới.
  const schema = useMemo(() => createLoginSchema(tValidation), [tValidation]);
  const prefilledEmail = useMemo(
    () =>
      initialEmail && createEmailSchema(tValidation).safeParse({ email: initialEmail }).success ? initialEmail : "",
    [initialEmail, tValidation],
  );
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefilledEmail, password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    // Lưu phiên; useRedirectIfAuthenticated thấy status = authenticated sẽ chuyển trang.
    onSuccess: (response) => signIn(response),
    onError: (error) => {
      applyServerFieldErrors(error, form.setError);
    },
  });

  // Lỗi theo từng ô đã hiện dưới ô; Alert chỉ cho lỗi chung. Thông báo từ URL (lỗi Google, lý do phải đăng nhập)
  // ẩn đi sau lần bấm đăng nhập đầu tiên.
  const hasFieldErrors = isApiError(mutation.error) && mutation.error.fieldErrors.length > 0;
  let notice: LoginNotice | null = null;
  if (mutation.status === "idle") {
    const googleMessage = getGoogleErrorMessage(googleError, tAuthErrors);
    notice = googleMessage ? { message: googleMessage, tone: "error" } : getSessionEndNotice(reason, tAuthErrors);
  } else if (mutation.isError && !hasFieldErrors) {
    notice = { message: getLoginErrorMessage(mutation.error, tAuthErrors, tErrors), tone: "error" };
    // Mật khẩu đúng nhưng tài khoản chưa kích hoạt: dẫn sang trang kích hoạt với email vừa nhập.
    if (isApiError(mutation.error) && mutation.error.code === "ACCOUNT_NOT_ACTIVATED") {
      const email = mutation.variables?.email ?? "";
      notice.action = { href: `/activate?${new URLSearchParams({ email })}`, label: t("activateAccount") };
    }
  }

  const { errors } = form.formState;
  const submitting = mutation.isPending || mutation.isSuccess;

  return (
    <div className="flex flex-col gap-6">
      <AuthFormHeader title={t("title")} description={t("subtitle")} />
      <AuthNotice notice={notice} />

      <GoogleSignInButton next={next} />

      {/* Nền chữ "or" phải trùng nền trang (bg-card) để che đường kẻ. */}
      <FieldSeparator className="my-0 *:data-[slot=field-separator-content]:bg-card">{t("or")}</FieldSeparator>

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="login-email">{t("email")}</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className="h-9"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <div className="flex items-center">
              <FieldLabel htmlFor="login-password">{t("password")}</FieldLabel>
              <Link href="/forgot-password" className={`${authLinkClassName} ml-auto`}>
                {t("forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              className="h-9"
              aria-invalid={!!errors.password}
              autoFocus={!!prefilledEmail}
              {...form.register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting && <Spinner />}
            {t("submit")}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-sm text-muted-foreground">{t("noAccount")}</p>
    </div>
  );
}
