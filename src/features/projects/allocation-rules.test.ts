import { describe, expect, it } from "vitest";
import {
  ALLOCATION_PERCENTS,
  allApplied,
  defaultPeriod,
  isRunningMember,
  pendingRequests,
  periodProblem,
  selectableIds,
  pickedIds,
} from "./allocation-rules";
import type { ProjectMember } from "./types";
import type { AllocationRequest, AllocationRequestStatus, Candidate } from "./work-types";

const TODAY = "2026-11-08";
const open = { startDate: "2026-06-01", endDate: null };
const ending = { startDate: "2026-06-01", endDate: "2026-12-31" };

const candidate = (id: string, freePercent: number | null, alreadyInProject = false): Candidate => ({
  person: { id, employeeCode: id, fullName: id },
  alreadyInProject,
  freePercent,
});

const request = (id: string, status: AllocationRequestStatus, createdAt: string): AllocationRequest => ({
  id,
  projectId: "p",
  projectCode: "HRM",
  projectName: "HRM",
  employee: { id: "an", employeeCode: "NV1", fullName: "An" },
  percent: 50,
  fromDate: TODAY,
  toDate: null,
  note: null,
  status,
  requestedBy: null,
  approvalRequestId: null,
  createdAt,
  decidedAt: null,
});

describe("ALLOCATION_PERCENTS", () => {
  it("là bội của 5 từ 100 xuống 5", () => {
    expect(ALLOCATION_PERCENTS).toHaveLength(20);
    expect(ALLOCATION_PERCENTS[0]).toBe(100);
    expect(ALLOCATION_PERCENTS.at(-1)).toBe(5);
    expect(ALLOCATION_PERCENTS.every((p) => p % 5 === 0)).toBe(true);
  });
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
  it("\"Chọn tất cả\" lấy người chưa ở dự án và còn đủ chỗ", () => {
    const list = [candidate("an", 60), candidate("binh", 40), candidate("chi", 100, true), candidate("dung", null)];
    expect(selectableIds(list, 50)).toEqual(["an", "dung"]);
  });

  it("mặc định không chọn ai; theo lựa chọn của người dùng, nhưng luôn bỏ người không đủ chỗ", () => {
    const list = [candidate("an", 100), candidate("binh", 100, true), candidate("chi", 20)];
    expect(pickedIds(list, 50, new Map())).toEqual([]);
    expect(pickedIds(list, 50, new Map([["an", false], ["binh", true], ["chi", true]]))).toEqual(["binh"]);
    expect(pickedIds(list, 20, new Map([["chi", true]]))).toEqual(["chi"]);
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
    allocationPercent: 50,
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
