import { z } from "zod";

// Khớp giới hạn của LoginRequest phía backend. Đăng nhập không áp quy tắc độ mạnh mật khẩu.
// TODO(i18n): chuyển chữ hiển thị sang file dịch khi làm đa ngôn ngữ.
export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254, "Email is too long"),
  password: z.string().min(1, "Enter your password").max(128, "Password must be at most 128 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
