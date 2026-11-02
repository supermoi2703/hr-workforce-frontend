import { describe, expect, it } from "vitest";
import { addDays, endOfDay, freeParts, monthGrid, monthRange, shiftMonth, weekdayIndex } from "./calendar";
import type { LeaveRequest } from "./types";

function request(part: LeaveRequest["part"], status: LeaveRequest["status"] = "PENDING"): LeaveRequest {
  return {
    id: part,
    employeeId: "e",
    employeeCode: null,
    employeeName: null,
    leaveType: "ANNUAL",
    startDate: "2026-11-05",
    endDate: "2026-11-05",
    part,
    days: part === "FULL_DAY" ? 1 : 0.5,
    reason: "x",
    shortNotice: false,
    status,
    cancelStatus: null,
    cancelReason: null,
    createdAt: "2026-11-01T00:00:00Z",
    decidedAt: null,
  };
}

describe("calendar", () => {
  it("lưới tháng 11/2026 bắt đầu từ thứ Hai, ngày 1 là Chủ nhật", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.at(-1)?.[0]).toBe("2026-11-30");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("tính ngày theo lịch, không lệch múi giờ", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayIndex("2026-11-02")).toBe(0);
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("giờ kết thúc = giờ bắt đầu + 9 tiếng", () => {
    expect(endOfDay("08:30:00")).toBe("17:30");
    expect(endOfDay("07:30")).toBe("16:30");
  });

  it("buổi còn trống bỏ buổi đã có đơn đang chờ / đã duyệt", () => {
    expect(freeParts([], "2026-11-05")).toEqual(["FULL_DAY", "MORNING", "AFTERNOON"]);
    expect(freeParts([request("MORNING")], "2026-11-05")).toEqual(["AFTERNOON"]);
    expect(freeParts([request("FULL_DAY", "APPROVED")], "2026-11-05")).toEqual([]);
    expect(freeParts([request("FULL_DAY", "REJECTED")], "2026-11-05")).toHaveLength(3);
  });
});
