import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "./format";

// Kết quả không phụ thuộc múi giờ của máy chạy test: luôn hiển thị theo giờ Việt Nam.
describe("format", () => {
  it("ngày dạng yyyy-MM-dd (LocalDate) không bị lệch ngày", () => {
    expect(formatDate("2026-10-13")).toBe("13/10/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });

  it("thời điểm UTC được đổi sang giờ Việt Nam", () => {
    expect(formatTime("2026-10-13T01:30:00Z")).toBe("08:30");
    expect(formatDate("2026-10-12T18:00:00Z")).toBe("13/10/2026");
    expect(formatDateTime("2026-10-13T01:30:00Z")).toContain("08:30");
  });

  it("giá trị rỗng/không hợp lệ hiển thị fallback", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatCurrency(undefined, "")).toBe("");
  });

  it("tiền VND", () => {
    expect(formatCurrency(15_500_000).replace(/\s/g, " ")).toBe("15.500.000 ₫");
  });
});
