import { describe, expect, it } from "vitest";
import { canSendMail, introOrUndefined, knownMailError, mailRefetchInterval, MAX_INTRO, summarizeCounts, validateIntro } from "./mail";

describe("validateIntro", () => {
  it("tối đa 300 ký tự sau khi cắt khoảng trắng", () => {
    expect(validateIntro("x".repeat(MAX_INTRO))).toBeNull();
    expect(validateIntro(`  ${"x".repeat(MAX_INTRO)}  `)).toBeNull();
    expect(validateIntro("x".repeat(MAX_INTRO + 1))).toBe("tooLong");
    expect(validateIntro("")).toBeNull();
  });

  it("introOrUndefined bỏ lời nhắn rỗng", () => {
    expect(introOrUndefined("   ")).toBeUndefined();
    expect(introOrUndefined(" Chào cả nhà ")).toBe("Chào cả nhà");
  });
});

describe("summarizeCounts", () => {
  it("gom số theo trạng thái, thiếu thì là 0", () => {
    expect(summarizeCounts({ SENT: 8, FAILED: 1 })).toEqual({ sent: 8, failed: 1, pending: 0, total: 9 });
    expect(summarizeCounts(undefined)).toEqual({ sent: 0, failed: 0, pending: 0, total: 0 });
  });

  it("tự làm mới 5 giây khi còn PENDING, dừng khi hết", () => {
    expect(mailRefetchInterval({ PENDING: 2, SENT: 3 })).toBe(5000);
    expect(mailRefetchInterval({ SENT: 5 })).toBe(false);
    expect(mailRefetchInterval(undefined)).toBe(false);
  });
});

describe("helpers", () => {
  it("NO_EMAIL được nhận ra, mã khác thì không", () => {
    expect(knownMailError("NO_EMAIL")).toBe("NO_EMAIL");
    expect(knownMailError("SMTP_TIMEOUT")).toBeNull();
    expect(knownMailError(null)).toBeNull();
  });

  it("chỉ kỳ PUBLISHED gửi được", () => {
    expect(canSendMail("PUBLISHED")).toBe(true);
    expect(canSendMail("CLOSED")).toBe(false);
    expect(canSendMail("APPROVED")).toBe(false);
  });
});
