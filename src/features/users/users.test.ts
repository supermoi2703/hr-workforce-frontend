import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import { getUserError } from "./error-messages";
import { createUserSchema, updateUserSchema } from "./schemas";

const tValidation = createTranslator({ locale: "en", messages: en, namespace: "Users.Validation" });
const tUserErrors = createTranslator({ locale: "en", messages: en, namespace: "Users.Errors" });
const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

const apiError = (status: number, code: string) => new ApiError({ status, code, message: `backend: ${code}` });

describe("createUserSchema", () => {
  const schema = createUserSchema(tValidation);
  const valid = { email: "nv1@test.com", displayName: "Nguyễn Văn An", roleCodes: [] };

  it("hợp lệ; tên được cắt khoảng trắng hai đầu", () => {
    const result = schema.safeParse({ ...valid, displayName: "  Nguyễn Văn An  " });
    expect(result.success && result.data.displayName).toBe("Nguyễn Văn An");
  });

  it("email sai, tên rỗng / chỉ khoảng trắng, tên quá 150 ký tự", () => {
    const messages = (input: object) => schema.safeParse(input).error?.issues.map((issue) => issue.message);
    expect(messages({ ...valid, email: "abc" })).toEqual(["Enter a valid email address"]);
    expect(messages({ ...valid, displayName: "   " })).toEqual(["Enter a display name"]);
    expect(messages({ ...valid, displayName: "a".repeat(151) })).toEqual([
      "Display name must be at most 150 characters",
    ]);
  });
});

describe("updateUserSchema", () => {
  it("chỉ kiểm tra tên hiển thị", () => {
    const schema = updateUserSchema(tValidation);
    expect(schema.safeParse({ displayName: "Trần Thị Bình" }).success).toBe(true);
    expect(schema.safeParse({ displayName: "" }).success).toBe(false);
  });
});

describe("getUserError", () => {
  const userError = (error: unknown) => getUserError(error, tUserErrors, tErrors);

  it("email trùng gắn vào ô email", () => {
    expect(userError(apiError(409, "EMAIL_ALREADY_EXISTS"))).toEqual({
      field: "email",
      message: "This email already has an account.",
    });
  });

  it("các quy tắc bảo vệ của backend hiện Alert với câu riêng", () => {
    expect(userError(apiError(409, "CANNOT_MODIFY_SELF"))).toEqual({
      field: null,
      message: "You can't do this to your own account.",
    });
    expect(userError(apiError(403, "ADMIN_ACCOUNT_PROTECTED")).message).toContain("Only administrators");
    expect(userError(apiError(409, "INVALID_STATUS_TRANSITION")).message).toContain("status has changed");
    expect(userError(apiError(400, "ROLE_NOT_FOUND")).message).toContain("no longer exists");
    expect(userError(apiError(429, "ACTIVATION_RESEND_TOO_SOON")).message).toBe(
      "Wait a minute before sending another code.",
    );
  });

  it("mã chung dùng namespace Errors, mã lạ dùng message của backend", () => {
    expect(userError(apiError(403, "FORBIDDEN")).message).toBe(en.Errors.forbidden);
    expect(userError(apiError(409, "SOMETHING_NEW")).message).toBe("backend: SOMETHING_NEW");
  });
});
