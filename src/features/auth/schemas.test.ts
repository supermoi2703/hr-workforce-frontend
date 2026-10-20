import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { createActivateSchema, createChangePasswordSchema, createResetPasswordSchema } from "./schemas";

const t = createTranslator({ locale: "en", messages: en, namespace: "Auth.Validation" });

/** Lỗi đầu tiên của từng ô, dạng { ô: câu báo lỗi }. */
function errorsOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

describe("createResetPasswordSchema", () => {
  const schema = createResetPasswordSchema(t);
  const valid = { otp: "482017", newPassword: "NewPass2026", confirmPassword: "NewPass2026" };

  it("đủ mã 6 số, mật khẩu đạt, nhập lại khớp thì hợp lệ", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("mã phải đúng 6 chữ số", () => {
    for (const otp of ["", "12345", "1234567", "12a456"]) {
      expect(errorsOf(schema.safeParse({ ...valid, otp }))).toMatchObject({ otp: "Enter the 6-digit code" });
    }
  });

  it("mật khẩu yếu và nhập lại không khớp báo đúng ô", () => {
    expect(errorsOf(schema.safeParse({ ...valid, newPassword: "short1", confirmPassword: "short1" }))).toMatchObject({
      newPassword: "Password doesn't meet the requirements",
    });
    expect(errorsOf(schema.safeParse({ ...valid, confirmPassword: "NewPass2025" }))).toEqual({
      confirmPassword: "Passwords don't match",
    });
  });
});

describe("createChangePasswordSchema", () => {
  const schema = createChangePasswordSchema(t);
  const valid = { currentPassword: "Admin12345", newPassword: "NewPass2026", confirmPassword: "NewPass2026" };

  it("hợp lệ; mật khẩu hiện tại chỉ cần không rỗng (không áp quy tắc độ mạnh)", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, currentPassword: "old" }).success).toBe(true);
  });

  it("thiếu mật khẩu hiện tại, mật khẩu mới yếu, nhập lại không khớp", () => {
    expect(errorsOf(schema.safeParse({ ...valid, currentPassword: "" }))).toMatchObject({
      currentPassword: "Enter your password",
    });
    expect(errorsOf(schema.safeParse({ ...valid, newPassword: "abc", confirmPassword: "abc" }))).toMatchObject({
      newPassword: "Password doesn't meet the requirements",
    });
    expect(errorsOf(schema.safeParse({ ...valid, confirmPassword: "Other2026" }))).toEqual({
      confirmPassword: "Passwords don't match",
    });
  });
});

describe("createActivateSchema", () => {
  const schema = createActivateSchema(t);
  const valid = { email: "nv@test.com", otp: "482017", password: "MatKhau123", confirmPassword: "MatKhau123" };

  it("hợp lệ với tên field khớp ActivateAccountRequest (password, không phải newPassword)", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("email sai định dạng", () => {
    expect(errorsOf(schema.safeParse({ ...valid, email: "khong-phai-email" }))).toMatchObject({
      email: "Enter a valid email address",
    });
  });
});
