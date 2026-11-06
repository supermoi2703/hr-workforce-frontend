import { describe, expect, it } from "vitest";
import {
  addDays,
  canRequestLeave,
  canRequestRemote,
  endOfDay,
  freeParts,
  isPersonalReason,
  monthGrid,
  monthRange,
  remoteRequestsOn,
  REMOTE_REASONS,
  shiftMonth,
  statusTone,
  weekdayIndex,
} from "./calendar";
import type { LeaveRequest, RemoteWorkRequest, TimesheetDay } from "./types";

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

function remote(part: RemoteWorkRequest["part"], status: RemoteWorkRequest["status"] = "APPROVED"): RemoteWorkRequest {
  return {
    id: part,
    employeeId: "e",
    employeeCode: null,
    employeeName: null,
    workDate: "2026-11-05",
    part,
    reason: "HEALTH",
    personal: true,
    detail: "x",
    days: part === "FULL_DAY" ? 1 : 0.5,
    shortNotice: false,
    status,
    cancelStatus: null,
    cancelReason: null,
    createdAt: "2026-11-01T00:00:00Z",
    decidedAt: null,
  };
}

const workingDay = { workDate: "2026-11-05", dayType: "WORKING_DAY" } as TimesheetDay;

describe("làm từ xa trên lịch", () => {
  it("chỉ tính đơn WFH đang chờ hoặc đã duyệt của đúng ngày", () => {
    expect(remoteRequestsOn([remote("MORNING", "PENDING")], "2026-11-05")).toHaveLength(1);
    expect(remoteRequestsOn([remote("MORNING", "CANCELLED")], "2026-11-05")).toHaveLength(0);
    expect(remoteRequestsOn([remote("MORNING")], "2026-11-06")).toHaveLength(0);
  });

  it("buổi đã có đơn WFH không còn trống để xin nghỉ hay xin WFH", () => {
    expect(freeParts([], "2026-11-05", [remote("MORNING")])).toEqual(["AFTERNOON"]);
    expect(freeParts([request("AFTERNOON")], "2026-11-05", [remote("MORNING")])).toEqual([]);
    expect(canRequestLeave(workingDay, [], [remote("FULL_DAY")])).toBe(false);
  });

  it("chỉ xin WFH cho ngày làm việc từ hôm nay trở đi", () => {
    expect(canRequestRemote(workingDay, "2026-11-05", [], [])).toBe(true);
    expect(canRequestRemote(workingDay, "2026-11-06", [], [])).toBe(false);
    expect(canRequestRemote({ ...workingDay, dayType: "HOLIDAY" }, "2026-11-05", [], [])).toBe(false);
    expect(canRequestRemote(undefined, "2026-11-05", [], [])).toBe(false);
  });

  it("ba lý do chủ động, ba lý do khách quan", () => {
    expect(REMOTE_REASONS.filter(isPersonalReason)).toEqual(["HEALTH", "FAMILY", "PERSONAL_TRAVEL"]);
  });

  it("REMOTE cùng màu với ngày nghỉ có đơn", () => {
    expect(statusTone("REMOTE")).toBe("info");
  });
});

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
