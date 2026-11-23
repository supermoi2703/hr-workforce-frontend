import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import viMessages from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { assignOvertime, claimOvertime, declineOvertime, getClaimDraft, getMyOvertime, listOvertime, OVERTIME_API } from "./api";
import { getOvertimeError, isStaleOvertimeError } from "./error-messages";
import {
  canAssignOvertime,
  canSubmitClaim,
  checkWindow,
  durationParts,
  endsNextDay,
  formatDuration,
  isSettled,
  remainingOf,
  rowActions,
  usagePercent,
  windowOf,
} from "./rules";
import { OVERTIME_STATUSES, type ClaimDraft, type OvertimeRequest, type OvertimeUsage } from "./types";

const tViDuration = createTranslator({ locale: "vi", messages: viMessages, namespace: "Overtime.duration" });
const tEnDuration = createTranslator({ locale: "en", messages: en, namespace: "Overtime.duration" });

describe("formatDuration", () => {
  it("tách giờ và phút", () => {
    expect(durationParts(165)).toEqual({ hours: 2, minutes: 45 });
    expect(durationParts(-10)).toEqual({ hours: 0, minutes: 0 });
  });

  it("viết kiểu '2 giờ 45'", () => {
    expect(formatDuration(165, tViDuration)).toBe("2 giờ 45");
    expect(formatDuration(125, tViDuration)).toBe("2 giờ 05");
    expect(formatDuration(120, tViDuration)).toBe("2 giờ");
    expect(formatDuration(45, tViDuration)).toBe("45 phút");
    expect(formatDuration(0, tViDuration)).toBe("0 phút");
    expect(formatDuration(null, tViDuration)).toBe("—");
    expect(formatDuration(2400, tViDuration)).toBe("40 giờ");
  });

  it("tiếng Anh", () => {
    expect(formatDuration(165, tEnDuration)).toBe("2h 45");
    expect(formatDuration(60, tEnDuration)).toBe("1h");
    expect(formatDuration(30, tEnDuration)).toBe("30 min");
  });
});

describe("windowOf: kết thúc không sau bắt đầu là sang hôm sau", () => {
  it("khung trong ngày", () => {
    expect(windowOf("18:00", "21:00")).toEqual({ minutes: 180, nextDay: false });
  });

  it("qua nửa đêm", () => {
    expect(windowOf("21:00", "01:30")).toEqual({ minutes: 270, nextDay: true });
    expect(windowOf("22:00", "00:00")).toEqual({ minutes: 120, nextDay: true });
  });

  it("bằng nhau là đủ 24 giờ, hôm sau", () => {
    expect(windowOf("08:00", "08:00")).toEqual({ minutes: 1440, nextDay: true });
  });

  it("giờ sai định dạng", () => {
    expect(windowOf("25:00", "21:00")).toBeNull();
    expect(windowOf("", "21:00")).toBeNull();
  });

  it("phiếu đã có: endAt khác ngày làm là hôm sau", () => {
    const toVn = (value: string) => value.slice(0, 10);
    expect(endsNextDay({ workDate: "2026-12-12", endAt: "2026-12-13T01:30:00+07:00" }, toVn)).toBe(true);
    expect(endsNextDay({ workDate: "2026-12-10", endAt: "2026-12-10T21:00:00+07:00" }, toVn)).toBe(false);
  });
});

const usage = (overrides: Partial<OvertimeUsage> = {}): OvertimeUsage => ({
  usedMonthMinutes: 0,
  usedYearMinutes: 0,
  monthCapMinutes: 2400,
  yearCapMinutes: 12000,
  maxDayMinutes: 240,
  scheduledEnd: "17:30",
  enforceCaps: true,
  ...overrides,
});

const NOW = { today: "2026-12-01", nowTime: "09:00" };

describe("checkWindow", () => {
  const values = { workDate: "2026-12-10", startTime: "18:00", endTime: "21:00" };

  it("khung hợp lệ (ví dụ T1: 18–21)", () => {
    const check = checkWindow(values, usage(), { mode: "assign", ...NOW });
    expect(check.errors).toEqual([]);
    expect(check.window).toEqual({ minutes: 180, nextDay: false });
    expect(check.remainingMinutes).toBe(240);
  });

  it("thiếu ô thì báo required", () => {
    expect(checkWindow({ ...values, endTime: "" }, usage(), { mode: "claim", ...NOW }).errors).toEqual(["required"]);
  });

  it("ngày làm việc phải bắt đầu sau giờ kết thúc riêng", () => {
    const check = checkWindow({ ...values, startTime: "17:00" }, usage(), { mode: "assign", ...NOW });
    expect(check.errors).toContain("beforeScheduleEnd");
    // Ngày nghỉ (scheduledEnd null): giờ nào cũng được
    expect(checkWindow({ ...values, startTime: "08:00", endTime: "12:00" }, usage({ scheduledEnd: null, maxDayMinutes: 720 }), { mode: "assign", ...NOW }).errors).toEqual([]);
  });

  it("T4c: ngày làm việc quá 4 giờ thì chặn", () => {
    const check = checkWindow({ ...values, startTime: "17:30", endTime: "22:30" }, usage(), { mode: "assign", ...NOW });
    expect(check.errors).toContain("dailyLimit");
  });

  it("T8: đã có 38 giờ trong tháng, giao thêm 3 giờ thì chặn khi enforceCaps", () => {
    const check = checkWindow(values, usage({ usedMonthMinutes: 38 * 60 }), { mode: "assign", ...NOW });
    expect(check.errors).toEqual(["monthCap"]);
    expect(check.remainingMinutes).toBe(120);
  });

  it("enforceCaps = false: vượt trần chỉ là cảnh báo", () => {
    const check = checkWindow(values, usage({ usedMonthMinutes: 38 * 60, usedYearMinutes: 199 * 60, enforceCaps: false }), { mode: "assign", ...NOW });
    expect(check.errors).toEqual([]);
    expect(check.warnings).toEqual(["monthCap", "yearCap"]);
  });

  it("phiếu PM giao phải bắt đầu ở tương lai; khai báo thì không", () => {
    const past = { workDate: "2026-12-01", startTime: "08:30", endTime: "10:00" };
    expect(checkWindow(past, null, { mode: "assign", ...NOW }).errors).toEqual(["startInPast"]);
    expect(checkWindow(past, null, { mode: "claim", ...NOW }).errors).toEqual([]);
  });

  it("chưa có usage thì chỉ kiểm khung giờ", () => {
    const check = checkWindow({ ...values, startTime: "08:00", endTime: "20:00" }, undefined, { mode: "claim", ...NOW });
    expect(check.errors).toEqual([]);
    expect(check.remainingMinutes).toBeNull();
  });

  it("phần còn lại không âm", () => {
    expect(remainingOf(usage({ usedYearMinutes: 13000 }))).toBe(0);
  });
});

const draft = (overrides: Partial<ClaimDraft> = {}): ClaimDraft => ({
  workDate: "2026-12-10",
  suggestedStart: "17:45",
  suggestedEnd: "20:45",
  withinWindow: true,
  deadline: "2026-12-14",
  tasks: [{ taskId: "t1", taskKey: "CRM-7", taskTitle: "Báo cáo", projectId: "p1", projectName: "CRM" }],
  ...overrides,
});

describe("canSubmitClaim", () => {
  const ok = { errors: [] };

  it("trong hạn, đã chọn task của mình, khung không lỗi thì gửi được", () => {
    expect(canSubmitClaim({ draft: draft(), taskId: "t1", check: ok })).toBe(true);
  });

  it("quá hạn khai (withinWindow = false) thì khóa nút", () => {
    expect(canSubmitClaim({ draft: draft({ withinWindow: false }), taskId: "t1", check: ok })).toBe(false);
  });

  it("chưa có bản gợi ý, chưa chọn task, task không thuộc danh sách, đang gửi, khung lỗi thì khóa", () => {
    expect(canSubmitClaim({ draft: undefined, taskId: "t1", check: ok })).toBe(false);
    expect(canSubmitClaim({ draft: draft(), taskId: "", check: ok })).toBe(false);
    expect(canSubmitClaim({ draft: draft(), taskId: "HRM-31", check: ok })).toBe(false);
    expect(canSubmitClaim({ draft: draft(), taskId: "t1", check: ok, pending: true })).toBe(false);
    expect(canSubmitClaim({ draft: draft(), taskId: "t1", check: { errors: ["dailyLimit"] } })).toBe(false);
  });
});

const item = (overrides: Partial<OvertimeRequest> = {}): OvertimeRequest => ({
  id: "ot-1",
  kind: "ASSIGNED",
  status: "WAIT_EMPLOYEE",
  employeeId: "e1",
  employeeName: "An",
  projectId: "p1",
  projectName: "CRM",
  taskId: "t1",
  taskKey: "CRM-7",
  taskTitle: "Báo cáo",
  workDate: "2026-12-10",
  startAt: "2026-12-10T18:00:00+07:00",
  endAt: "2026-12-10T21:00:00+07:00",
  plannedMinutes: 180,
  reason: null,
  createdById: "pm",
  createdByName: "Lan",
  respondedAt: null,
  approvalRequestId: null,
  dayType: "WORKING_DAY",
  paidMinutesNormal: null,
  paidMinutesNight: null,
  pendingHrDecision: false,
  settledAt: null,
  createdAt: "2026-12-01T09:00:00+07:00",
  canAccept: false,
  canDecline: false,
  canCancel: false,
  ...overrides,
});

describe("rowActions: nút theo cờ can* của backend", () => {
  it("nhân viên được giao, phiếu đang chờ: Đồng ý + Từ chối", () => {
    expect(rowActions(item({ canAccept: true, canDecline: true }))).toEqual({
      accept: true,
      decline: true,
      cancel: null,
      approvalLink: null,
    });
  });

  it("không có cờ nào thì không có nút, dù trạng thái đang chờ", () => {
    for (const status of OVERTIME_STATUSES) {
      expect(rowActions(item({ status }))).toEqual({ accept: false, decline: false, cancel: null, approvalLink: null });
    }
  });

  it("PM hủy phiếu giao; nhân viên rút phiếu khai", () => {
    expect(rowActions(item({ canCancel: true })).cancel).toBe("cancel");
    expect(rowActions(item({ kind: "CLAIMED", status: "WAIT_APPROVAL", canCancel: true })).cancel).toBe("withdraw");
  });

  it("phiếu khai dẫn tới trang duyệt", () => {
    expect(rowActions(item({ kind: "CLAIMED", approvalRequestId: "ap-9" })).approvalLink).toBe("/approvals/ap-9");
    expect(rowActions(item({ kind: "ASSIGNED", approvalRequestId: "ap-9" })).approvalLink).toBeNull();
  });

  it("giờ đã tính chỉ hiện khi SETTLED", () => {
    expect(isSettled(item({ status: "SETTLED", paidMinutesNormal: 60, paidMinutesNight: 60 }))).toBe(true);
    expect(isSettled(item({ status: "ACTIVE", paidMinutesNormal: 60 }))).toBe(false);
    expect(isSettled(item({ status: "SETTLED" }))).toBe(false);
  });
});

describe("canAssignOvertime", () => {
  const base = {
    isProjectManager: true,
    projectActive: true,
    assigneeId: "e-an",
    myEmployeeId: "e-lan",
    taskStatus: "IN_PROGRESS",
    hasSubtasks: false,
  };

  it("PM, task lá có người làm, chưa xong", () => {
    expect(canAssignOvertime(base)).toBe(true);
  });

  it("ẩn khi không phải PM, chưa có người làm, task xong / hủy, có task con, dự án đóng, PM tự giao", () => {
    expect(canAssignOvertime({ ...base, isProjectManager: false })).toBe(false);
    expect(canAssignOvertime({ ...base, assigneeId: null })).toBe(false);
    expect(canAssignOvertime({ ...base, taskStatus: "DONE" })).toBe(false);
    expect(canAssignOvertime({ ...base, taskStatus: "CANCELLED" })).toBe(false);
    expect(canAssignOvertime({ ...base, hasSubtasks: true })).toBe(false);
    expect(canAssignOvertime({ ...base, projectActive: false })).toBe(false);
    expect(canAssignOvertime({ ...base, assigneeId: "e-lan" })).toBe(false);
  });
});

describe("usagePercent", () => {
  it("chặn trong 0–100", () => {
    expect(usagePercent(1200, 2400)).toBe(50);
    expect(usagePercent(3000, 2400)).toBe(100);
    expect(usagePercent(0, 0)).toBe(0);
  });
});

describe("lỗi", () => {
  const t = createTranslator({ locale: "vi", messages: viMessages, namespace: "Overtime.errors" });
  const tErrors = createTranslator({ locale: "vi", messages: viMessages, namespace: "Errors" });
  const apiError = (code: string) => new ApiError({ status: 400, code, message: "english" });

  it("mọi mã OVERTIME_* của hợp đồng có câu riêng", () => {
    const codes = [
      "OVERTIME_TASK_NOT_ASSIGNED",
      "OVERTIME_NOT_PROJECT_MEMBER",
      "OVERTIME_TASK_CLOSED",
      "OVERTIME_TASK_NOT_LEAF",
      "OVERTIME_PROJECT_INACTIVE",
      "OVERTIME_NOT_PROJECT_MANAGER",
      "OVERTIME_BEFORE_SCHEDULE_END",
      "OVERTIME_DAILY_LIMIT",
      "OVERTIME_MONTH_CAP",
      "OVERTIME_YEAR_CAP",
      "OVERTIME_OVERLAP",
      "OVERTIME_ON_LEAVE",
      "OVERTIME_CLAIM_WINDOW_CLOSED",
      "OVERTIME_END_TOO_LATE",
      "OVERTIME_INVALID_STATE",
    ];
    for (const code of codes) {
      const text = getOvertimeError(apiError(code), t, tErrors);
      expect(text, code).not.toBe("english");
      expect(text, code).not.toContain("Overtime.");
    }
  });

  it("mã lạ dùng câu chung; dữ liệu cũ thì tải lại", () => {
    expect(getOvertimeError(apiError("FORBIDDEN"), t, tErrors)).toBe(tErrors("forbidden"));
    expect(isStaleOvertimeError(apiError("OVERTIME_INVALID_STATE"))).toBe(true);
    expect(isStaleOvertimeError(apiError("OVERTIME_DAILY_LIMIT"))).toBe(false);
  });
});

describe("api", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const ok = (data: unknown) =>
    new Response(JSON.stringify({ success: true, code: "OK", message: "Success", data, timestamp: "" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const call = (index: number) => {
    const [url, init] = fetchMock.mock.calls[index];
    return { url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
  };

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => ok({}));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("giao và khai gửi đúng đường dẫn, giờ HH:mm, lý do trống thành null", async () => {
    await assignOvertime({ employeeId: "e1", taskId: "t1", workDate: "2026-12-12", startTime: "21:00", endTime: "01:30", reason: "  " });
    expect(call(0)).toEqual({
      url: `${OVERTIME_API}/overtime/assignments`,
      method: "POST",
      body: { employeeId: "e1", taskId: "t1", workDate: "2026-12-12", startTime: "21:00", endTime: "01:30", reason: null },
    });

    await claimOvertime({ taskId: "t1", workDate: "2026-12-10", startTime: "18:00", endTime: "20:45", reason: " Lỗi gấp " });
    expect(call(1)).toMatchObject({ url: `${OVERTIME_API}/overtime/claims`, body: { taskId: "t1", reason: "Lỗi gấp" } });

    await declineOvertime("ot 1", "");
    expect(call(2)).toEqual({ url: `${OVERTIME_API}/overtime/ot%201/decline`, method: "POST", body: { reason: null } });
  });

  it("query theo tháng / ngày / bộ lọc", async () => {
    await getMyOvertime("2026-12");
    await getClaimDraft("2026-12-10");
    await listOvertime({ month: "2026-12", status: "SETTLED" }, { page: 1, size: 20 });
    expect(call(0).url).toBe(`${OVERTIME_API}/overtime/me?month=2026-12`);
    expect(call(1).url).toBe(`${OVERTIME_API}/overtime/claim-draft?date=2026-12-10`);
    expect(call(2).url).toBe(`${OVERTIME_API}/overtime?page=1&size=20&month=2026-12&status=SETTLED`);
  });
});
