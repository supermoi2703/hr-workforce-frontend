import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import {
  getChangePasswordError,
  getCodeFlowAlert,
  getCodeFlowError,
  getGoogleErrorMessage,
  getLoginErrorMessage,
  getSessionEndNotice,
} from "./error-messages";

function translators(locale: "en" | "vi", messages: typeof en) {
  return {
    auth: createTranslator({ locale, messages, namespace: "Auth.Errors" }),
    errors: createTranslator({ locale, messages, namespace: "Errors" }),
  };
}

const t = translators("en", en);

const apiError = (status: number, code: string, retryAfterSeconds?: number, message = code) =>
  new ApiError({ status, code, message, retryAfterSeconds });

const loginMessage = (error: unknown) => getLoginErrorMessage(error, t.auth, t.errors);

describe("getLoginErrorMessage", () => {
  it("sai email hay sai mật khẩu đều cùng một câu", () => {
    expect(loginMessage(apiError(401, "INVALID_CREDENTIALS"))).toBe("Incorrect email or password.");
  });

  it("429 báo số phút theo Retry-After, làm tròn lên, đúng số ít / số nhiều", () => {
    expect(loginMessage(apiError(429, "TOO_MANY_REQUESTS", 900))).toContain("in 15 minutes");
    expect(loginMessage(apiError(429, "TOO_MANY_REQUESTS", 61))).toContain("in 2 minutes");
    expect(loginMessage(apiError(429, "TOO_MANY_REQUESTS", 5))).toContain("in 1 minute.");
    expect(loginMessage(apiError(429, "TOO_MANY_REQUESTS"))).toContain("in a few minutes");
  });

  it("trạng thái tài khoản có hướng dẫn riêng", () => {
    expect(loginMessage(apiError(403, "ACCOUNT_LOCKED"))).toContain("locked");
    expect(loginMessage(apiError(403, "ACCOUNT_DISABLED"))).toContain("disabled");
    expect(loginMessage(apiError(403, "ACCOUNT_NOT_ACTIVATED"))).toContain("not activated");
  });

  it("lỗi chung dùng namespace Errors, mã lạ dùng message của backend", () => {
    expect(loginMessage(apiError(0, "NETWORK_ERROR"))).toContain("Can't reach the server");
    expect(loginMessage(apiError(409, "SOMETHING_NEW", undefined, "Backend says no"))).toBe("Backend says no");
    expect(loginMessage(new Error("x"))).toBe("Something went wrong. Please try again.");
  });

  it("theo ngôn ngữ đang chọn", () => {
    const tVi = translators("vi", vi);
    expect(getLoginErrorMessage(apiError(401, "INVALID_CREDENTIALS"), tVi.auth, tVi.errors)).toBe(
      "Email hoặc mật khẩu không đúng.",
    );
    expect(getLoginErrorMessage(apiError(429, "TOO_MANY_REQUESTS", 900), tVi.auth, tVi.errors)).toContain("sau 15 phút");
  });
});

describe("getCodeFlowError / getCodeFlowAlert (đặt lại mật khẩu, kích hoạt)", () => {
  const flow = (error: unknown) => getCodeFlowError(error, t.auth, t.errors);
  const alert = (error: unknown) => getCodeFlowAlert(error, t.auth, t.errors);

  it("mã sai về ô mã, mật khẩu yếu / trùng về ô mật khẩu, không hiện Alert", () => {
    expect(flow(apiError(400, "INVALID_OTP"))).toEqual({
      field: "otp",
      message: "The code is incorrect or has expired. Request a new code.",
    });
    expect(flow(apiError(400, "WEAK_PASSWORD"))).toMatchObject({ field: "password" });
    expect(flow(apiError(400, "PASSWORD_REUSED"))).toMatchObject({
      field: "password",
      message: "Choose a password different from your current one.",
    });
    expect(alert(apiError(400, "INVALID_OTP"))).toBeNull();
  });

  it("429 hiện Alert kèm số phút", () => {
    expect(alert(apiError(429, "TOO_MANY_REQUESTS", 3600))).toBe("Too many attempts. Try again in 60 minutes.");
    expect(alert(apiError(429, "TOO_MANY_REQUESTS"))).toBe("Too many attempts. Try again in a few minutes.");
  });

  it("lỗi validation theo từng ô không hiện Alert; không có lỗi thì không có Alert", () => {
    const validation = new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "x",
      fieldErrors: [{ field: "otp", message: "must be 6 digits" }],
    });
    expect(alert(validation)).toBeNull();
    expect(alert(null)).toBeNull();
    expect(alert(apiError(0, "NETWORK_ERROR"))).toContain("Can't reach the server");
  });
});

describe("getChangePasswordError", () => {
  const change = (error: unknown) => getChangePasswordError(error, t.auth, t.errors);

  it("gắn lỗi vào đúng ô", () => {
    expect(change(apiError(400, "CURRENT_PASSWORD_INCORRECT"))).toEqual({
      field: "currentPassword",
      message: "Your current password is incorrect.",
    });
    expect(change(apiError(400, "WEAK_PASSWORD"))).toMatchObject({ field: "newPassword" });
    expect(change(apiError(400, "PASSWORD_REUSED"))).toMatchObject({ field: "newPassword" });
  });

  it("tài khoản chỉ đăng nhập Google: Alert kèm cờ để hiện link đặt mật khẩu", () => {
    expect(change(apiError(400, "NO_PASSWORD_SET"))).toMatchObject({ field: null, noPassword: true });
  });

  it("quá nhiều lần (không có Retry-After) và lỗi mạng hiện Alert", () => {
    expect(change(apiError(429, "TOO_MANY_REQUESTS"))).toEqual({
      field: null,
      message: "Too many attempts. Try again in a few minutes.",
    });
    expect(change(apiError(0, "NETWORK_ERROR")).field).toBeNull();
  });
});

describe("getSessionEndNotice", () => {
  it("hết phiên là thông tin, tài khoản bị khóa / vô hiệu hóa là lỗi", () => {
    expect(getSessionEndNotice("session_expired", t.auth)).toEqual({
      message: "Your session has expired. Please sign in again.",
      tone: "info",
    });
    expect(getSessionEndNotice("ACCOUNT_LOCKED", t.auth)).toMatchObject({ tone: "error" });
    expect(getSessionEndNotice("ACCOUNT_DISABLED", t.auth)).toMatchObject({ tone: "error" });
  });

  it("sau khi đặt lại mật khẩu / kích hoạt mà tự đăng nhập không được", () => {
    expect(getSessionEndNotice("password_reset", t.auth)).toMatchObject({ tone: "info" });
    expect(getSessionEndNotice("account_activated", t.auth)).toMatchObject({ tone: "info" });
  });

  it("không có hoặc giá trị lạ trên URL thì không báo", () => {
    for (const reason of [undefined, null, "", "ACCOUNT_NOT_ACTIVATED", "<script>"]) {
      expect(getSessionEndNotice(reason, t.auth)).toBeNull();
    }
  });
});

describe("getGoogleErrorMessage", () => {
  it("không có mã hoặc người dùng tự hủy thì không báo", () => {
    expect(getGoogleErrorMessage(undefined, t.auth)).toBeNull();
    expect(getGoogleErrorMessage("", t.auth)).toBeNull();
    expect(getGoogleErrorMessage("GOOGLE_LOGIN_CANCELLED", t.auth)).toBeNull();
  });

  it("mã đã biết có thông báo riêng", () => {
    expect(getGoogleErrorMessage("ACCOUNT_NOT_FOUND", t.auth)).toContain("doesn't have an account");
    expect(getGoogleErrorMessage("ACCOUNT_LOCKED", t.auth)).toContain("locked");
  });

  it("mã lạ chỉ hiện câu chung, không lặp lại giá trị trên URL", () => {
    expect(getGoogleErrorMessage("<script>alert(1)</script>", t.auth)).toBe("Google sign-in failed. Please try again.");
  });
});
