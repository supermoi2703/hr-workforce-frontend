import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type OvertimeErrorKey = keyof Messages["Overtime"]["errors"];
/** Hàm dịch của namespace "Overtime.errors". */
export type OvertimeErrorsTranslator = (key: OvertimeErrorKey) => string;

// Mã lỗi theo hợp đồng ot-kpi-api.md mục 3. Vài mã cùng nghĩa (tên khác) đặt chung một câu để không lộ câu tiếng Anh.
const ERROR_KEYS: Record<string, OvertimeErrorKey> = {
  OVERTIME_TASK_NOT_ASSIGNED: "taskNotAssigned",
  OVERTIME_NOT_PROJECT_MEMBER: "notProjectMember",
  OVERTIME_TASK_CLOSED: "taskClosed",
  OVERTIME_TASK_NOT_LEAF: "taskNotLeaf",
  OVERTIME_PROJECT_INACTIVE: "projectInactive",
  OVERTIME_PROJECT_CLOSED: "projectInactive",
  OVERTIME_NOT_PROJECT_MANAGER: "notProjectManager",
  OVERTIME_BEFORE_SCHEDULE_END: "beforeScheduleEnd",
  OVERTIME_DURING_WORKING_HOURS: "beforeScheduleEnd",
  OVERTIME_DAILY_LIMIT: "dailyLimit",
  OVERTIME_MONTH_CAP: "monthCap",
  OVERTIME_YEAR_CAP: "yearCap",
  OVERTIME_OVERLAP: "overlap",
  OVERTIME_ON_LEAVE: "onLeave",
  OVERTIME_CLAIM_WINDOW_CLOSED: "claimWindowClosed",
  OVERTIME_CLAIM_TOO_LATE: "claimWindowClosed",
  OVERTIME_END_TOO_LATE: "endTooLate",
  OVERTIME_INVALID_WINDOW: "endTooLate",
  OVERTIME_INVALID_STATE: "invalidState",
  OVERTIME_NOT_PENDING: "invalidState",
  OVERTIME_EXPIRED: "expired",
  OVERTIME_ASSIGN_TOO_LATE: "assignTooLate",
  OVERTIME_SELF_ASSIGN: "selfAssign",
  OVERTIME_NOT_FOUND: "notFound",
};

/** Phiếu đã đổi trạng thái ở nơi khác (nhân viên vừa bấm, PM vừa hủy, đã hết hạn): tải lại danh sách. */
const STALE_CODES = new Set(["OVERTIME_INVALID_STATE", "OVERTIME_NOT_PENDING", "OVERTIME_EXPIRED", "OVERTIME_NOT_FOUND"]);

export function isStaleOvertimeError(error: unknown): boolean {
  return isApiError(error) && STALE_CODES.has(error.code);
}

export function overtimeErrorKey(code: string): OvertimeErrorKey | undefined {
  return ERROR_KEYS[code];
}

export function getOvertimeError(error: unknown, t: OvertimeErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
