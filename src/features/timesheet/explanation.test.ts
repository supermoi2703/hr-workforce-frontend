import { describe, expect, it } from "vitest";
import { awaitingHrDecision, canExplain, canLockPeriod, isValidClaim, periodTone, toInstant } from "./explanation";
import type { Explanation, TimesheetDay } from "./types";

const day = (over: Partial<TimesheetDay>): TimesheetDay => ({
  workDate: "2026-11-12",
  dayType: "WORKING_DAY",
  status: "ABSENT",
  scheduleSource: "OFFICE",
  scheduledStart: "09:00:00",
  scheduledEnd: "18:00:00",
  firstIn: null,
  lastOut: null,
  lateMinutes: 0,
  earlyMinutes: 0,
  workedMinutes: 0,
  paidUnits: 0,
  leavePart: null,
  leaveTypeCode: null,
  remotePart: null,
  outsideOffice: false,
  ...over,
});

const pending = { workDate: "2026-11-12", status: "PENDING" } as Explanation;

describe("canExplain", () => {
  it("ngày vắng đã qua trong hạn thì giải trình được", () => {
    expect(canExplain(day({}), "2026-11-16", [])).toBe(true);
  });
  it("hôm nay hoặc tương lai thì không", () => {
    expect(canExplain(day({ workDate: "2026-11-16" }), "2026-11-16", [])).toBe(false);
  });
  it("quá 7 ngày thì không, đúng 7 ngày thì còn", () => {
    expect(canExplain(day({ workDate: "2026-11-09" }), "2026-11-16", [])).toBe(true);
    expect(canExplain(day({ workDate: "2026-11-08" }), "2026-11-16", [])).toBe(false);
  });
  it("đã có giải trình chờ thì không", () => {
    expect(canExplain(day({}), "2026-11-16", [pending])).toBe(false);
  });
  it("trạng thái đủ công hoặc ngày nghỉ thì không", () => {
    expect(canExplain(day({ status: "WORK" }), "2026-11-16", [])).toBe(false);
    expect(canExplain(day({ dayType: "WEEKLY_OFF" }), "2026-11-16", [])).toBe(false);
  });
  it("thiếu giờ ra đã được HR quyết thì không", () => {
    expect(canExplain(day({ status: "MISSING_OUT", paidUnits: 1 }), "2026-11-16", [])).toBe(false);
    expect(canExplain(day({ status: "MISSING_OUT", paidUnits: null }), "2026-11-16", [])).toBe(true);
  });
});

describe("awaitingHrDecision", () => {
  it("chỉ MISSING_OUT chưa có công", () => {
    expect(awaitingHrDecision(day({ status: "MISSING_OUT", paidUnits: null }))).toBe(true);
    expect(awaitingHrDecision(day({ status: "MISSING_OUT", paidUnits: 0.5 }))).toBe(false);
    expect(awaitingHrDecision(day({ status: "ABSENT", paidUnits: null }))).toBe(false);
    expect(awaitingHrDecision(undefined)).toBe(false);
  });
});

describe("giờ khai", () => {
  it("cần ít nhất một giờ, ra phải sau vào", () => {
    expect(isValidClaim("", "")).toBe(false);
    expect(isValidClaim("08:30", "")).toBe(true);
    expect(isValidClaim("08:30", "08:30")).toBe(false);
    expect(isValidClaim("08:30", "17:30")).toBe(true);
  });
  it("toInstant trả null khi trống", () => {
    expect(toInstant("2026-11-12", "")).toBeNull();
    expect(toInstant("2026-11-12", "08:30")).toMatch(/^2026-11-1[12]T/);
  });
});

describe("kỳ công", () => {
  it("màu nhãn", () => {
    expect(periodTone("OPEN")).toBe("warning");
    expect(periodTone("LOCKED")).toBe("success");
  });
  it("canLockPeriod cần OPEN, canLock và không còn chặn", () => {
    expect(canLockPeriod({ status: "OPEN", canLock: true, blockerCount: 0 })).toBe(true);
    expect(canLockPeriod({ status: "OPEN", canLock: true, blockerCount: 2 })).toBe(false);
    expect(canLockPeriod({ status: "OPEN", canLock: false, blockerCount: 0 })).toBe(false);
    expect(canLockPeriod({ status: "LOCKED", canLock: true, blockerCount: 0 })).toBe(false);
  });
});
