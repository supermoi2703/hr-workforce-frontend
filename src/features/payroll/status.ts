import type { PayrollAction, PayrollPeriodStatus, PeriodDetail, StatusLogEntry } from "./types";

/** Thứ tự 6 trạng thái của một kỳ lương, dùng cho stepper. */
export const PAYROLL_STEPS: PayrollPeriodStatus[] = ["OPEN", "LOCKED", "CALCULATED", "APPROVED", "PUBLISHED", "CLOSED"];

const KNOWN_ACTIONS: PayrollAction[] = ["LOCK", "CALCULATE", "SUBMIT", "PUBLISH", "REVOKE_APPROVAL", "CLOSE"];

export function stepIndex(status: PayrollPeriodStatus): number {
  return PAYROLL_STEPS.indexOf(status);
}

export type StepState = "done" | "current" | "upcoming";

export function stepState(step: PayrollPeriodStatus, current: PayrollPeriodStatus): StepState {
  const diff = stepIndex(step) - stepIndex(current);
  return diff < 0 ? "done" : diff === 0 ? "current" : "upcoming";
}

/** Chỉ giữ các action FE biết, theo thứ tự backend trả về. */
export function knownActions(nextActions: string[] | undefined): PayrollAction[] {
  return (nextActions ?? []).filter((action): action is PayrollAction => KNOWN_ACTIONS.includes(action as PayrollAction));
}

/** Ai/lúc nào đã đưa kỳ vào từng bước (null nếu chưa tới hoặc backend không ghi). */
export function stepStamp(period: PeriodDetail, step: PayrollPeriodStatus): { at: string; by: string | null } | null {
  const pairs: Record<PayrollPeriodStatus, [string | null, string | null]> = {
    OPEN: [null, null],
    LOCKED: [period.lockedAt, period.lockedBy],
    CALCULATED: [period.calculatedAt, period.calculatedBy],
    APPROVED: [period.approvedAt, period.approvedBy],
    PUBLISHED: [period.publishedAt, period.publishedBy],
    CLOSED: [period.closedAt, period.closedBy],
  };
  const [at, by] = pairs[step];
  return at ? { at, by } : null;
}

export const MIN_REVOKE_REASON = 10;

export function isValidRevokeReason(reason: string): boolean {
  return reason.trim().length >= MIN_REVOKE_REASON;
}

/** Nhật ký mới nhất lên đầu. */
export function sortedLog(log: StatusLogEntry[]): StatusLogEntry[] {
  return [...log].sort((a, b) => b.at.localeCompare(a.at));
}

/** "yyyy-MM" hợp lệ (tháng 01..12). */
export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
