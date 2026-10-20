import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { getGoogleErrorMessage, getLoginErrorMessage } from "./error-messages";
import { safeNextPath } from "./next-path";

const apiError = (status: number, code: string, retryAfterSeconds?: number, message = code) =>
  new ApiError({ status, code, message, retryAfterSeconds });

describe("getLoginErrorMessage", () => {
  it("sai email hay sai mật khẩu đều cùng một câu", () => {
    expect(getLoginErrorMessage(apiError(401, "INVALID_CREDENTIALS"))).toBe("Incorrect email or password.");
  });

  it("429 báo số phút theo Retry-After, làm tròn lên", () => {
    expect(getLoginErrorMessage(apiError(429, "TOO_MANY_REQUESTS", 900))).toContain("in 15 minutes");
    expect(getLoginErrorMessage(apiError(429, "TOO_MANY_REQUESTS", 61))).toContain("in 2 minutes");
    expect(getLoginErrorMessage(apiError(429, "TOO_MANY_REQUESTS", 5))).toContain("in 1 minute.");
    expect(getLoginErrorMessage(apiError(429, "TOO_MANY_REQUESTS"))).toContain("in a few minutes");
  });

  it("trạng thái tài khoản có hướng dẫn riêng", () => {
    expect(getLoginErrorMessage(apiError(403, "ACCOUNT_LOCKED"))).toContain("locked");
    expect(getLoginErrorMessage(apiError(403, "ACCOUNT_DISABLED"))).toContain("disabled");
    expect(getLoginErrorMessage(apiError(403, "ACCOUNT_NOT_ACTIVATED"))).toContain("not activated");
  });

  it("lỗi kết nối có câu riêng, mã lạ dùng message của backend", () => {
    expect(getLoginErrorMessage(apiError(0, "NETWORK_ERROR"))).toContain("Can't reach the server");
    expect(getLoginErrorMessage(apiError(409, "SOMETHING_NEW", undefined, "Backend says no"))).toBe("Backend says no");
    expect(getLoginErrorMessage(new Error("x"))).toBe("Something went wrong. Please try again.");
  });
});

describe("getGoogleErrorMessage", () => {
  it("không có mã hoặc người dùng tự hủy thì không báo", () => {
    expect(getGoogleErrorMessage(undefined)).toBeNull();
    expect(getGoogleErrorMessage("")).toBeNull();
    expect(getGoogleErrorMessage("GOOGLE_LOGIN_CANCELLED")).toBeNull();
  });

  it("mã đã biết có thông báo riêng", () => {
    expect(getGoogleErrorMessage("ACCOUNT_NOT_FOUND")).toContain("doesn't have an account");
    expect(getGoogleErrorMessage("ACCOUNT_LOCKED")).toContain("locked");
  });

  it("mã lạ chỉ hiện câu chung, không lặp lại giá trị trên URL", () => {
    expect(getGoogleErrorMessage("<script>alert(1)</script>")).toBe("Google sign-in failed. Please try again.");
  });
});

describe("safeNextPath", () => {
  it("giữ đường dẫn trong app", () => {
    expect(safeNextPath("/leave")).toBe("/leave");
    expect(safeNextPath("/admin/users?page=2")).toBe("/admin/users?page=2");
  });

  it("đường dẫn ra ngoài hoặc rỗng thì về trang chủ", () => {
    for (const next of [undefined, null, "", "leave", "//evil.com", "/\\evil.com", "https://evil.com"]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });
});
