import { describe, expect, it } from "vitest";
import { isValidMonth, isValidRevokeReason, knownActions, PAYROLL_STEPS, sortedLog, stepState } from "./status";

describe("payroll status", () => {
  it("có đúng 6 bước theo thứ tự", () => {
    expect(PAYROLL_STEPS).toEqual(["OPEN", "LOCKED", "CALCULATED", "APPROVED", "PUBLISHED", "CLOSED"]);
  });

  it("stepState phân biệt đã qua / hiện tại / chưa tới", () => {
    expect(stepState("OPEN", "CALCULATED")).toBe("done");
    expect(stepState("CALCULATED", "CALCULATED")).toBe("current");
    expect(stepState("CLOSED", "CALCULATED")).toBe("upcoming");
  });

  it("knownActions bỏ action lạ, giữ thứ tự", () => {
    expect(knownActions(["CALCULATE", "FOO", "SUBMIT"])).toEqual(["CALCULATE", "SUBMIT"]);
    expect(knownActions(undefined)).toEqual([]);
  });

  it("lý do thu hồi cần ít nhất 10 ký tự sau khi cắt khoảng trắng", () => {
    expect(isValidRevokeReason("   ngắn   ")).toBe(false);
    expect(isValidRevokeReason("sai số liệu thuế")).toBe(true);
  });

  it("sortedLog xếp mới nhất lên đầu", () => {
    const log = [
      { from: null, to: "OPEN" as const, actorUserId: null, reason: null, at: "2026-11-01T00:00:00Z" },
      { from: "OPEN" as const, to: "LOCKED" as const, actorUserId: null, reason: null, at: "2026-11-02T00:00:00Z" },
    ];
    expect(sortedLog(log)[0].to).toBe("LOCKED");
  });

  it("isValidMonth", () => {
    expect(isValidMonth("2026-11")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
  });
});
