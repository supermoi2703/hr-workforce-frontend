import type { ClaimDraft, OvertimeRequest, OvertimeUsage } from "./types";

const MINUTES_PER_DAY = 24 * 60;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ===== Thời lượng

/** Số phút thành giờ + phút để ghép câu: 165 → {hours: 2, minutes: 45}. Số âm coi như 0. */
export function durationParts(totalMinutes: number): { hours: number; minutes: number } {
  const value = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(value / 60), minutes: value % 60 };
}

type DurationKey = "hm" | "h" | "m";
/** Hàm dịch của namespace "Overtime.duration": hm "{h} giờ {m}", h "{h} giờ", m "{m} phút". */
export type DurationTranslator = (key: DurationKey, values: { h: number; m: string }) => string;

/** 165 → "2 giờ 45", 120 → "2 giờ", 45 → "45 phút", 125 → "2 giờ 05". null → fallback. */
export function formatDuration(minutes: number | null | undefined, t: DurationTranslator, fallback = "—"): string {
  if (minutes === null || minutes === undefined) return fallback;
  const { hours, minutes: rest } = durationParts(minutes);
  if (hours === 0) return t("m", { h: 0, m: String(rest) });
  if (rest === 0) return t("h", { h: hours, m: "0" });
  return t("hm", { h: hours, m: String(rest).padStart(2, "0") });
}

// ===== Khung giờ

export function isTime(value: string): boolean {
  return TIME.test(value);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Khung giờ "HH:mm"–"HH:mm" trong ngày workDate: giờ kết thúc không sau giờ bắt đầu nghĩa là sang hôm sau (hợp đồng API).
 * 18:00–21:00 → 180 phút; 21:00–01:30 → 270 phút, hôm sau. Giờ sai định dạng → null.
 */
export function windowOf(startTime: string, endTime: string): { minutes: number; nextDay: boolean } | null {
  if (!isTime(startTime) || !isTime(endTime)) return null;
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const nextDay = end <= start;
  return { minutes: nextDay ? MINUTES_PER_DAY - start + end : end - start, nextDay };
}

/** Phiếu đã có: kết thúc sang ngày khác ngày làm (so theo giờ Việt Nam). */
export function endsNextDay(request: Pick<OvertimeRequest, "workDate" | "endAt">, toIsoDate: (value: string) => string): boolean {
  return toIsoDate(request.endAt) > request.workDate;
}

// ===== Kiểm tra trước khi gửi (backend vẫn kiểm lại và trả mã lỗi)

export type WindowIssue =
  | "required"
  | "invalidTime"
  | "startInPast"
  | "beforeScheduleEnd"
  | "dailyLimit"
  | "monthCap"
  | "yearCap";

export type WindowCheck = {
  /** Chặn gửi. */
  errors: WindowIssue[];
  /** Chỉ nhắc (vượt trần khi `enforceCaps` = false). */
  warnings: WindowIssue[];
  window: { minutes: number; nextDay: boolean } | null;
  /** Số phút còn giao / khai được cho ngày này: min(trần ngày, phần còn lại của tháng, của năm). null khi chưa có usage. */
  remainingMinutes: number | null;
};

export type WindowCheckOptions = {
  /** assign: PM giao trước giờ bắt đầu. claim: nhân viên khai trước hoặc sau khung giờ. */
  mode: "assign" | "claim";
  /** Giờ hiện tại theo giờ Việt Nam: ngày "yyyy-MM-dd" và giờ "HH:mm". */
  today: string;
  nowTime: string;
};

/** Số phút còn lại trước khi chạm trần ngày / tháng / năm. */
export function remainingOf(usage: OvertimeUsage): number {
  return Math.max(
    0,
    Math.min(usage.maxDayMinutes, usage.monthCapMinutes - usage.usedMonthMinutes, usage.yearCapMinutes - usage.usedYearMinutes),
  );
}

/**
 * Kiểm khung giờ theo luật ở ot-kpi.md 1.1: ngày làm việc bắt đầu sau giờ kết thúc riêng, không quá trần ngày, tổng tháng /
 * năm không quá trần (chặn hay chỉ nhắc theo `enforceCaps`). Phiếu PM giao phải bắt đầu ở tương lai.
 */
export function checkWindow(
  values: { workDate: string; startTime: string; endTime: string },
  usage: OvertimeUsage | null | undefined,
  options: WindowCheckOptions,
): WindowCheck {
  const errors: WindowIssue[] = [];
  const warnings: WindowIssue[] = [];
  const remainingMinutes = usage ? remainingOf(usage) : null;

  if (!DATE.test(values.workDate) || !values.startTime || !values.endTime) {
    return { errors: ["required"], warnings, window: null, remainingMinutes };
  }
  const window = windowOf(values.startTime, values.endTime);
  if (!window) return { errors: ["invalidTime"], warnings, window: null, remainingMinutes };

  if (options.mode === "assign" && `${values.workDate}T${values.startTime}` <= `${options.today}T${options.nowTime}`) {
    errors.push("startInPast");
  }
  if (usage) {
    if (usage.scheduledEnd && isTime(usage.scheduledEnd.slice(0, 5)) && values.startTime < usage.scheduledEnd.slice(0, 5)) {
      errors.push("beforeScheduleEnd");
    }
    if (window.minutes > usage.maxDayMinutes) errors.push("dailyLimit");
    const caps = usage.enforceCaps ? errors : warnings;
    if (usage.usedMonthMinutes + window.minutes > usage.monthCapMinutes) caps.push("monthCap");
    if (usage.usedYearMinutes + window.minutes > usage.yearCapMinutes) caps.push("yearCap");
  }
  return { errors, warnings, window, remainingMinutes };
}

/** Nút "Gửi" của hộp khai báo: cần bản gợi ý, còn trong hạn khai, đã chọn task, khung giờ không lỗi. */
export function canSubmitClaim(input: {
  draft: Pick<ClaimDraft, "withinWindow" | "tasks"> | null | undefined;
  taskId: string;
  check: Pick<WindowCheck, "errors">;
  pending?: boolean;
}): boolean {
  const { draft, taskId, check, pending } = input;
  if (!draft || !draft.withinWindow || pending) return false;
  if (!taskId || !draft.tasks.some((task) => task.taskId === taskId)) return false;
  return check.errors.length === 0;
}

// ===== Nút trên một dòng

export type RowActions = {
  accept: boolean;
  decline: boolean;
  /** Hủy (PM, phiếu giao) hoặc rút (nhân viên, phiếu khai). */
  cancel: "cancel" | "withdraw" | null;
  /** Phiếu khai: mở yêu cầu duyệt. */
  approvalLink: string | null;
};

/** Nút hiện theo cờ backend tính cho người đang xem, không tự suy từ trạng thái. */
export function rowActions(
  item: Pick<OvertimeRequest, "kind" | "canAccept" | "canDecline" | "canCancel" | "approvalRequestId">,
): RowActions {
  return {
    accept: item.canAccept,
    decline: item.canDecline,
    cancel: item.canCancel ? (item.kind === "CLAIMED" ? "withdraw" : "cancel") : null,
    approvalLink: item.kind === "CLAIMED" && item.approvalRequestId ? `/approvals/${encodeURIComponent(item.approvalRequestId)}` : null,
  };
}

/** Giờ đã tính (thường + đêm) chỉ có ý nghĩa khi phiếu đã tính xong. */
export function isSettled(item: Pick<OvertimeRequest, "status" | "paidMinutesNormal" | "paidMinutesNight">): boolean {
  return item.status === "SETTLED" && (item.paidMinutesNormal !== null || item.paidMinutesNight !== null);
}

// ===== Tháng

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: string | null | undefined): value is string {
  return !!value && MONTH.test(value);
}

/** Phần trăm đã dùng so với trần, chặn trong 0–100 để vẽ thanh. */
export function usagePercent(used: number, cap: number): number {
  if (cap <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((used / cap) * 100)));
}

// ===== Giao làm thêm giờ từ chi tiết task

export type AssignEligibility = {
  /** Người đang xem là PM của dự án. */
  isProjectManager: boolean;
  projectActive: boolean;
  assigneeId: string | null;
  /** Hồ sơ nhân viên của người đang xem (PM không tự giao cho mình). */
  myEmployeeId: string | null | undefined;
  taskStatus: string;
  hasSubtasks: boolean;
};

const CLOSED_TASK_STATUSES = new Set(["DONE", "CANCELLED"]);

/** Nút "Giao làm thêm giờ": PM của dự án đang chạy, task lá đã có người làm khác PM và chưa xong. */
export function canAssignOvertime(input: AssignEligibility): boolean {
  return (
    input.isProjectManager &&
    input.projectActive &&
    !!input.assigneeId &&
    input.assigneeId !== input.myEmployeeId &&
    !CLOSED_TASK_STATUSES.has(input.taskStatus) &&
    !input.hasSubtasks
  );
}
