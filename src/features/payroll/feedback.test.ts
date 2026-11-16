import { describe, expect, it } from "vitest";
import { buildResolveBody, feedbackState, nextMonth, validateFeedback, validateResolve, type ResolveValues } from "./feedback";
import type { FeedbackView } from "./types";

const accepted: ResolveValues = { decision: "ACCEPTED", reason: "Thiếu một công ngày 20", amount: "909091", targetMonth: "2026-11" };

describe("validateFeedback", () => {
  it("Đúng: ghi chú tùy chọn, tối đa 500", () => {
    expect(validateFeedback("CONFIRM", "")).toBeNull();
    expect(validateFeedback("CONFIRM", "x".repeat(501))).toBe("noteLong");
  });

  it("Thắc mắc: ghi chú 10..500 sau khi cắt khoảng trắng", () => {
    expect(validateFeedback("DISPUTE", "   ngắn   ")).toBe("noteShort");
    expect(validateFeedback("DISPUTE", "Thiếu 1 công ngày 20/10")).toBeNull();
    expect(validateFeedback("DISPUTE", "x".repeat(501))).toBe("noteLong");
  });
});

describe("validateResolve", () => {
  it("chấp nhận hợp lệ", () => {
    expect(validateResolve(accepted, "2026-10")).toEqual({});
  });

  it("chấp nhận cần số tiền khác 0, nguyên, và kỳ nhận khác kỳ thắc mắc", () => {
    expect(validateResolve({ ...accepted, amount: "0" }, "2026-10").amount).toBe("amountZero");
    expect(validateResolve({ ...accepted, amount: "-5000" }, "2026-10")).toEqual({});
    expect(validateResolve({ ...accepted, amount: "1,5" }, "2026-10").amount).toBe("amountInteger");
    expect(validateResolve({ ...accepted, amount: "abc" }, "2026-10").amount).toBe("amountInvalid");
    expect(validateResolve({ ...accepted, targetMonth: "2026-10" }, "2026-10").targetMonth).toBe("targetSame");
    expect(validateResolve({ ...accepted, targetMonth: "" }, "2026-10").targetMonth).toBe("targetRequired");
  });

  it("từ chối chỉ cần lý do, bỏ qua số tiền và kỳ nhận", () => {
    expect(validateResolve({ decision: "REJECTED", reason: "Công đã đủ theo bảng công", amount: "", targetMonth: "" }, "2026-10")).toEqual({});
    expect(validateResolve({ decision: "REJECTED", reason: "ngắn", amount: "", targetMonth: "" }, "2026-10").reason).toBe("reasonShort");
  });

  it("buildResolveBody chỉ gửi số tiền và kỳ nhận khi chấp nhận", () => {
    expect(buildResolveBody(accepted)).toEqual({ decision: "ACCEPTED", reason: "Thiếu một công ngày 20", adjustAmount: 909091, targetMonth: "2026-11" });
    expect(buildResolveBody({ ...accepted, decision: "REJECTED" })).toEqual({ decision: "REJECTED", reason: "Thiếu một công ngày 20" });
  });
});

describe("helpers", () => {
  it("nextMonth qua năm", () => {
    expect(nextMonth("2026-10")).toBe("2026-11");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("feedbackState", () => {
    const base: FeedbackView = { kind: "DISPUTE", note: "x", status: "OPEN", decision: null, decisionReason: null, handledAt: null };
    expect(feedbackState({ ...base, kind: "CONFIRM", status: "RESOLVED" })).toBe("confirmed");
    expect(feedbackState(base)).toBe("waiting");
    expect(feedbackState({ ...base, status: "RESOLVED", decision: "ACCEPTED" })).toBe("accepted");
    expect(feedbackState({ ...base, status: "RESOLVED", decision: "REJECTED" })).toBe("rejected");
  });
});
