import { describe, expect, it } from "vitest";
import { canExportSheet, decideBlockReason, normalizeWarnings, percentChange, warningParams } from "./warnings";

describe("normalizeWarnings", () => {
  it("chuỗi cũ thành LEGACY", () => {
    expect(normalizeWarnings(["Thiếu KPI"])).toEqual([{ code: "LEGACY", params: null, text: "Thiếu KPI" }]);
  });
  it("object mới giữ mã và tham số, thiếu thì null", () => {
    expect(normalizeWarnings([{ code: "W_GT_N", params: { w: 23, n: 22 } }, { code: "NET_NEGATIVE" }])).toEqual([
      { code: "W_GT_N", params: { w: 23, n: 22 }, text: null },
      { code: "NET_NEGATIVE", params: null, text: null },
    ]);
  });
  it("null hoặc undefined thành mảng rỗng", () => {
    expect(normalizeWarnings(undefined)).toEqual([]);
    expect(normalizeWarnings(null)).toEqual([]);
  });
});

describe("warningParams", () => {
  it("giữ số và chuỗi, bỏ null, đổi kiểu khác thành chuỗi", () => {
    expect(warningParams({ a: 1, b: "x", c: null, d: true })).toEqual({ a: 1, b: "x", d: "true" });
    expect(warningParams(null)).toEqual({});
  });
});

describe("percentChange", () => {
  it("tăng và giảm, làm tròn 1 chữ số", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(95, 100)).toBe(-5);
    expect(percentChange(101, 300)).toBe(-66.3);
  });
  it("không có kỳ trước hoặc kỳ trước bằng 0 thì null", () => {
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(100, undefined)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("canExportSheet", () => {
  it("kỳ đã tính trở đi và có phiếu thì xuất được", () => {
    for (const s of ["CALCULATED", "APPROVED", "PUBLISHED", "CLOSED"] as const) expect(canExportSheet(s, 3)).toBe(true);
  });
  it("kỳ OPEN/LOCKED hoặc 0 phiếu thì khóa", () => {
    expect(canExportSheet("OPEN", 3)).toBe(false);
    expect(canExportSheet("LOCKED", 3)).toBe(false);
    expect(canExportSheet("CALCULATED", 0)).toBe(false);
  });
});

describe("decideBlockReason", () => {
  it("quyết được thì không có lý do", () => {
    expect(decideBlockReason(true, "u1", "u2")).toBeNull();
  });
  it("người gửi tự xem thì submitter, người khác thì notPending", () => {
    expect(decideBlockReason(false, "u1", "u1")).toBe("submitter");
    expect(decideBlockReason(false, "u1", "u2")).toBe("notPending");
    expect(decideBlockReason(false, null, undefined)).toBe("notPending");
  });
});
