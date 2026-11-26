import { describe, expect, it } from "vitest";
import { hasBlockers, isSheetWarning } from "./checks";

describe("hasBlockers", () => {
  it("có blocker thì khóa", () => {
    expect(hasBlockers({ step: "calculate", blockers: [{ code: "TIMESHEET_NOT_LOCKED" }], warnings: [] })).toBe(true);
  });
  it("chỉ có warning hoặc không có dữ liệu thì không khóa", () => {
    expect(hasBlockers({ step: "submit", blockers: [], warnings: [{ code: "KPI_MISSING", count: 2 }] })).toBe(false);
    expect(hasBlockers(undefined)).toBe(false);
  });
});

describe("isSheetWarning", () => {
  it("mã cảnh báo phiếu thì bấm được về bảng lương", () => {
    expect(isSheetWarning("KPI_MISSING")).toBe(true);
    expect(isSheetWarning("RECIPIENTS")).toBe(false);
  });

  it("F1-4/F1-5 mã chặn gửi duyệt là mã kiểm tra của bước, không phải cảnh báo phiếu", () => {
    expect(isSheetWarning("INPUTS_CHANGED")).toBe(false);
    expect(isSheetWarning("CALC_ERRORS")).toBe(false);
    expect(isSheetWarning("KPI_FIRST_MONTH")).toBe(true);
  });
});
