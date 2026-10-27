import type { Messages } from "next-intl";
import { z } from "zod";
import { isPasswordValid } from "./password-policy";

type ValidationKey = keyof Messages["Auth"]["Validation"];
/** Hàm dịch của namespace "Auth.Validation": `useTranslations("Auth.Validation")`. */
export type ValidationTranslator = (key: ValidationKey) => string;

// Câu báo lỗi theo ngôn ngữ đang chọn. Tên field khớp DTO request của backend để applyServerFieldErrors
// gắn lỗi trả về vào đúng ô.

function emailField(t: ValidationTranslator) {
  return z.email(t("emailInvalid")).max(254, t("emailTooLong"));
}

/**
 * Schema form đăng nhập. Khớp giới hạn của LoginRequest phía backend.
 * Đăng nhập không áp quy tắc độ mạnh mật khẩu (mật khẩu cũ có thể đặt trước khi có quy tắc).
 */
export function createLoginSchema(t: ValidationTranslator) {
  return z.object({
    email: emailField(t),
    password: z.string().min(1, t("passwordRequired")).max(128, t("passwordTooLong")),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

/** Bước 1 của quên mật khẩu: chỉ cần email. */
export function createEmailSchema(t: ValidationTranslator) {
  return z.object({ email: emailField(t) });
}

export type EmailFormValues = z.infer<ReturnType<typeof createEmailSchema>>;

function otpField(t: ValidationTranslator) {
  return z.string().regex(/^\d{6}$/, t("otpInvalid"));
}

/** Mật khẩu mới theo PasswordPolicy + ô nhập lại phải khớp (lỗi gắn vào ô nhập lại). */
function withNewPassword<Field extends "newPassword" | "password">(field: Field, t: ValidationTranslator) {
  return {
    password: z.string().refine(isPasswordValid, t("passwordWeak")),
    confirm: (values: Record<Field | "confirmPassword", string>, ctx: z.RefinementCtx) => {
      if (values[field] !== values.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: t("passwordMismatch") });
      }
    },
  };
}

/** Bước 2 của quên mật khẩu. Khớp ResetPasswordRequest {email, otp, newPassword}. */
export function createResetPasswordSchema(t: ValidationTranslator) {
  const rules = withNewPassword("newPassword", t);
  return z
    .object({
      otp: otpField(t),
      newPassword: rules.password,
      confirmPassword: z.string(),
    })
    .superRefine(rules.confirm);
}

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>;

/** Kích hoạt tài khoản. Khớp ActivateAccountRequest {email, otp, password}. */
export function createActivateSchema(t: ValidationTranslator) {
  const rules = withNewPassword("password", t);
  return z
    .object({
      email: emailField(t),
      otp: otpField(t),
      password: rules.password,
      confirmPassword: z.string(),
    })
    .superRefine(rules.confirm);
}

export type ActivateFormValues = z.infer<ReturnType<typeof createActivateSchema>>;

/** Đổi mật khẩu khi đang đăng nhập. Khớp ChangePasswordRequest {currentPassword, newPassword}. */
export function createChangePasswordSchema(t: ValidationTranslator) {
  const rules = withNewPassword("newPassword", t);
  return z
    .object({
      currentPassword: z.string().min(1, t("passwordRequired")).max(128, t("passwordTooLong")),
      newPassword: rules.password,
      confirmPassword: z.string(),
    })
    .superRefine(rules.confirm);
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;
