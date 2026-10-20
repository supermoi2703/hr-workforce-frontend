"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { login } from "../api";
import { getGoogleErrorMessage, getLoginErrorMessage } from "../error-messages";
import { safeNextPath } from "../next-path";
import { createLoginSchema, type LoginFormValues } from "../schemas";
import { GoogleSignInButton } from "./google-sign-in-button";
import { PasswordInput } from "./password-input";

type LoginFormProps = {
  /** `?next=`: trang đang mở trước khi bị chuyển về đăng nhập. */
  next?: string;
  /** `?error=`: mã lỗi backend gắn lên URL khi đăng nhập Google thất bại. */
  googleError?: string;
};

export function LoginForm({ next, googleError }: LoginFormProps) {
  const t = useTranslations("Auth.Login");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const tValidation = useTranslations("Auth.Validation");
  const router = useRouter();

  // Tạo lại schema khi đổi ngôn ngữ để câu báo lỗi của lần kiểm tra sau theo ngôn ngữ mới.
  const schema = useMemo(() => createLoginSchema(tValidation), [tValidation]);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      // TODO(cuongvv): lưu phiên (signIn(response)) khi làm BackendAuthProvider. Hiện chỉ chuyển trang:
      // chế độ mock vào thẳng dashboard, chế độ backend sẽ bị đưa lại về /login cho tới khi nối phiên.
      router.replace(safeNextPath(next));
    },
    onError: (error) => {
      applyServerFieldErrors(error, form.setError);
    },
  });

  // Lỗi theo từng ô đã hiện dưới ô; Alert chỉ cho lỗi chung. Lỗi Google ẩn đi sau lần bấm đăng nhập đầu tiên.
  const hasFieldErrors = isApiError(mutation.error) && mutation.error.fieldErrors.length > 0;
  const alertMessage =
    mutation.status === "idle"
      ? getGoogleErrorMessage(googleError, tAuthErrors)
      : mutation.isError && !hasFieldErrors
        ? getLoginErrorMessage(mutation.error, tAuthErrors, tErrors)
        : null;

  const { errors } = form.formState;
  const submitting = mutation.isPending || mutation.isSuccess;

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2 flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {alertMessage && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      <GoogleSignInButton />

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
              <Link
                href="/forgot-password"
                className="ml-auto rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              className="h-9"
              aria-invalid={!!errors.password}
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
