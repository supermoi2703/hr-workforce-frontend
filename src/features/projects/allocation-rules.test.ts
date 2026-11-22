import { describe, expect, it } from "vitest";
import {
  allApplied,
  dayOffsetPercent,
  defaultPeriod,
  isRunningMember,
  monthTicks,
  pendingRequests,
  periodProblem,
  scheduleRange,
  weekBars,
  weekOn,
  selectableIds,
  pickedIds,
  timelineSpan,
} from "./allocation-rules";
import type { ProjectMember } from "./types";
import type { AllocationRequest, AllocationRequestStatus, Candidate, LoadWeek } from "./work-types";

const TODAY = "2026-11-08";
const open = { startDate: "2026-06-01", endDate: null };
const ending = { startDate: "2026-06-01", endDate: "2026-12-31" };

const candidate = (id: string, alreadyInProject = false): Candidate => ({
  person: { id, employeeCode: id, fullName: id },
  alreadyInProject,
  load: null,
});

const request = (id: string, status: AllocationRequestStatus, createdAt: string): AllocationRequest => ({
  id,
  projectId: "p",
  projectCode: "HRM",
  projectName: "HRM",
  employee: { id: "an", employeeCode: "NV1", fullName: "An" },
  percent: null,
  fromDate: TODAY,
  toDate: null,
  note: null,
  status,
  requestedBy: null,
  approvalRequestId: null,
  createdAt,
  decidedAt: null,
});

describe("defaultPeriod", () => {
  it("bắt đầu hôm nay, tới ngày kết thúc dự án", () => {
    expect(defaultPeriod(ending, TODAY)).toEqual({ from: TODAY, to: "2026-12-31" });
  });

  it("dự án chưa chạy thì bắt đầu từ ngày bắt đầu dự án", () => {
    expect(defaultPeriod({ startDate: "2026-12-01", endDate: null }, TODAY)).toEqual({ from: "2026-12-01", to: null });
  });
});

describe("periodProblem", () => {
  it("nhận khoảng hợp lệ, kể cả không có ngày kết thúc khi dự án cũng không có", () => {
    expect(periodProblem(open, TODAY, { from: TODAY, to: null })).toBeNull();
    expect(periodProblem(ending, TODAY, { from: TODAY, to: "2026-12-31" })).toBeNull();
  });

  it("không đề xuất lùi ngày", () => {
    expect(periodProblem(open, TODAY, { from: "2026-11-07", to: null })).toBe("fromBeforeToday");
  });

  it("phải nằm trong thời gian dự án", () => {
    const future = { startDate: "2026-12-01", endDate: null };
    expect(periodProblem(future, TODAY, { from: TODAY, to: null })).toBe("beforeProjectStart");
    expect(periodProblem(ending, TODAY, { from: TODAY, to: null })).toBe("endRequired");
    expect(periodProblem(ending, TODAY, { from: TODAY, to: "2027-01-01" })).toBe("afterProjectEnd");
  });

  it("đến ngày không trước từ ngày", () => {
    expect(periodProblem(open, TODAY, { from: "2026-11-20", to: "2026-11-19" })).toBe("endBeforeStart");
  });
});

describe("chọn người", () => {
  it("\"Chọn tất cả\" lấy người chưa ở dự án, kể cả người đang bận (không còn trần %)", () => {
    const list = [candidate("an"), candidate("binh"), candidate("chi", true)];
    expect(selectableIds(list)).toEqual(["an", "binh"]);
  });

  it("mặc định không chọn ai; theo lựa chọn của người dùng", () => {
    const list = [candidate("an"), candidate("binh", true), candidate("chi")];
    expect(pickedIds(list, new Map())).toEqual([]);
    expect(pickedIds(list, new Map([["an", false], ["binh", true], ["chi", true]]))).toEqual(["binh", "chi"]);
  });
});

describe("đề xuất", () => {
  it("lấy đề xuất đang chờ, mới nhất trước", () => {
    const list = [request("a", "PENDING", "2026-11-01T01:00:00Z"), request("b", "APPROVED", "2026-11-02T01:00:00Z"),
      request("c", "PENDING", "2026-11-03T01:00:00Z")];
    expect(pendingRequests(list).map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("cả lô đã vào dự án ngay khi mọi đề xuất được duyệt", () => {
    expect(allApplied([request("a", "APPROVED", TODAY)])).toBe(true);
    expect(allApplied([request("a", "APPROVED", TODAY), request("b", "PENDING", TODAY)])).toBe(false);
    expect(allApplied([])).toBe(false);
  });
});

describe("isRunningMember", () => {
  const member = (role: ProjectMember["role"], toDate: string | null): ProjectMember => ({
    employee: { id: "an", employeeCode: "NV1", fullName: "An" },
    role,
    projectMinutesPerWeek: 0,
    zone: "GREEN",
    fromDate: "2026-10-01",
    toDate,
  });

  it("chỉ thành viên chưa kết thúc", () => {
    expect(isRunningMember(member("MEMBER", null), TODAY)).toBe(true);
    expect(isRunningMember(member("MEMBER", TODAY), TODAY)).toBe(true);
    expect(isRunningMember(member("MEMBER", "2026-11-07"), TODAY)).toBe(false);
    expect(isRunningMember(member("PM", null), TODAY)).toBe(false);
  });
});

/** pendingPercent: phần đang chờ; backend trả heldPercent = đã duyệt + đang chờ. */

describe("scheduleRange", () => {
  it("keeps valid dates and leaves missing ones to the backend", () => {
    expect(scheduleRange("2026-11-01", "2027-01-31")).toEqual({ from: "2026-11-01", to: "2027-01-31" });
    expect(scheduleRange(null, null)).toEqual({ from: undefined, to: undefined });
  });

  it("drops values that are not real days", () => {
    expect(scheduleRange("2026-02-30", "abc")).toEqual({ from: undefined, to: undefined });
    expect(scheduleRange("2026-1-5", "2026-12-01")).toEqual({ from: undefined, to: "2026-12-01" });
  });

  it("drops an end before the start", () => {
    expect(scheduleRange("2026-11-10", "2026-11-01")).toEqual({ from: "2026-11-10" });
  });
});

describe("weekBars", () => {
  const week = (weekStart: string, loadMinutes: number): LoadWeek => ({
    weekStart, capacityMinutes: 2400, loadMinutes, percent: Math.round((loadMinutes * 100) / 2400), zone: loadMinutes > 2400 ? "YELLOW" : "GREEN",
  });

  it("places each week by its days and clips to the range", () => {
    // 01/11/2026 là Chủ nhật: tuần 26/10 chỉ còn 1 ngày trong trục
    const bars = weekBars([week("2026-10-26", 600), week("2026-11-02", 2880), week("2026-12-07", 0)], "2026-11-01", "2026-11-30");
    expect(bars.map((bar) => [bar.start, bar.end])).toEqual([
      ["2026-11-01", "2026-11-01"],
      ["2026-11-02", "2026-11-08"],
    ]);
    expect(bars[1]).toMatchObject({ loadMinutes: 2880, zone: "YELLOW" });
    expect(Math.round(bars[1].widthPercent * 10) / 10).toBe(23.3);
  });

  it("finds the week holding a day", () => {
    const weeks = [week("2026-11-02", 600), week("2026-11-09", 1200)];
    expect(weekOn(weeks, "2026-11-08")?.loadMinutes).toBe(600);
    expect(weekOn(weeks, "2026-11-15")?.loadMinutes).toBe(1200);
    expect(weekOn(weeks, "2026-11-16")).toBeNull();
  });
});

describe("timelineSpan", () => {
  // Tháng 11/2026: 30 ngày, mỗi ngày 1/30 trục
  const FROM = "2026-11-01";
  const TO = "2026-11-30";

  it("places a period inside the range by its days", () => {
    const span = timelineSpan("2026-11-11", "2026-11-20", FROM, TO)!;
    expect(span.leftPercent).toBeCloseTo((10 / 30) * 100);
    expect(span.widthPercent).toBeCloseTo((10 / 30) * 100);
    expect(span).toMatchObject({ startsBefore: false, endsAfter: false });
  });

  it("clips a period running past both ends and marks it", () => {
    expect(timelineSpan("2026-10-01", "2026-12-31", FROM, TO)).toMatchObject({
      start: FROM,
      end: TO,
      leftPercent: 0,
      widthPercent: 100,
      startsBefore: true,
      endsAfter: true,
    });
  });

  it("treats no end date as running past the range", () => {
    expect(timelineSpan("2026-11-21", null, FROM, TO)).toMatchObject({ end: TO, endsAfter: true });
  });

  it("is null outside the range", () => {
    expect(timelineSpan("2026-12-01", null, FROM, TO)).toBeNull();
    expect(timelineSpan("2026-09-01", "2026-10-31", FROM, TO)).toBeNull();
  });
});

describe("dayOffsetPercent", () => {
  it("points at the middle of the day, null outside", () => {
    expect(dayOffsetPercent("2026-11-01", "2026-11-01", "2026-11-10")).toBeCloseTo(5);
    expect(dayOffsetPercent("2026-11-10", "2026-11-01", "2026-11-10")).toBeCloseTo(95);
    expect(dayOffsetPercent("2026-11-11", "2026-11-01", "2026-11-10")).toBeNull();
  });
});

describe("monthTicks", () => {
  it("marks the first of each month after the start, across the new year", () => {
    const ticks = monthTicks("2026-11-12", "2027-02-01");
    expect(ticks.map((tick) => tick.date)).toEqual(["2026-12-01", "2027-01-01", "2027-02-01"]);
    expect(ticks.map((tick) => [tick.month, tick.year])).toEqual([
      [12, 2026],
      [1, 2027],
      [2, 2027],
    ]);
    expect(ticks[2].leftPercent).toBeLessThan(100);
  });

  it("skips the start day itself and handles empty ranges", () => {
    expect(monthTicks("2026-12-01", "2026-12-31")).toEqual([]);
    expect(monthTicks("2026-12-31", "2026-12-01")).toEqual([]);
  });
});
