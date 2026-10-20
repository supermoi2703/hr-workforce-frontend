import type { Messages } from "next-intl";
import { z } from "zod";

type ValidationKey = keyof Messages["Auth"]["Validation"];

/**
 * Schema form đăng nhập; câu báo lỗi theo ngôn ngữ đang chọn (truyền `useTranslations("Auth.Validation")`).
 * Khớp giới hạn của LoginRequest phía backend. Đăng nhập không áp quy tắc độ mạnh mật khẩu.
 */
export function createLoginSchema(t: (key: ValidationKey) => string) {
  return z.object({
    email: z.email(t("emailInvalid")).max(254, t("emailTooLong")),
    password: z.string().min(1, t("passwordRequired")).max(128, t("passwordTooLong")),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
