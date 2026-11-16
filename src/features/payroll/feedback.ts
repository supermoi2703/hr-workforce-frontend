import { parseNumber } from "./inputs";
import type { FeedbackDecision, FeedbackKind, FeedbackView } from "./types";

export const MIN_NOTE = 10;
export const MAX_NOTE = 500;
export const MIN_DECISION_REASON = 10;
export const MAX_DECISION_REASON = 1000;

export type FeedbackError = "noteShort" | "noteLong";

/** "Đúng": ghi chú tùy chọn (≤ 500). "Thắc mắc": ghi chú bắt buộc 10..500 ký tự sau khi cắt khoảng trắng. */
export function validateFeedback(kind: FeedbackKind, note: string): FeedbackError | null {
  const length = note.trim().length;
  if (length > MAX_NOTE) return "noteLong";
  if (kind === "DISPUTE" && length < MIN_NOTE) return "noteShort";
  return null;
}

export type ResolveValues = {
  decision: FeedbackDecision;
  reason: string;
  amount: string;
  targetMonth: string;
};

export type ResolveErrorKey = "reasonShort" | "reasonLong" | "amountInvalid" | "amountInteger" | "amountZero" | "targetRequired" | "targetInvalid" | "targetSame";

export type ResolveErrors = Partial<Record<"reason" | "amount" | "targetMonth", ResolveErrorKey>>;

/** Luật như PayslipFeedbackService.resolve; backend kiểm lại. Chấp nhận cần số tiền khác 0 và kỳ nhận khác kỳ thắc mắc. */
export function validateResolve(values: ResolveValues, complaintMonth: string): ResolveErrors {
  const errors: ResolveErrors = {};
  const reason = values.reason.trim();
  if (reason.length < MIN_DECISION_REASON) errors.reason = "reasonShort";
  else if (reason.length > MAX_DECISION_REASON) errors.reason = "reasonLong";

  if (values.decision === "ACCEPTED") {
    const amount = parseNumber(values.amount);
    if (amount === null) errors.amount = "amountInvalid";
    else if (!Number.isInteger(amount)) errors.amount = "amountInteger";
    else if (amount === 0) errors.amount = "amountZero";

    const target = values.targetMonth.trim();
    if (target === "") errors.targetMonth = "targetRequired";
    else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(target)) errors.targetMonth = "targetInvalid";
    else if (target === complaintMonth) errors.targetMonth = "targetSame";
  }
  return errors;
}

export function buildResolveBody(values: ResolveValues): {
  decision: FeedbackDecision;
  reason: string;
  adjustAmount?: number;
  targetMonth?: string;
} {
  const body: { decision: FeedbackDecision; reason: string; adjustAmount?: number; targetMonth?: string } = {
    decision: values.decision,
    reason: values.reason.trim(),
  };
  if (values.decision === "ACCEPTED") {
    body.adjustAmount = parseNumber(values.amount) ?? 0;
    body.targetMonth = values.targetMonth.trim();
  }
  return body;
}

/** Tháng sau của "yyyy-MM" (gợi ý kỳ nhận điều chỉnh). */
export function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
}

export type FeedbackState = "confirmed" | "waiting" | "accepted" | "rejected";

/** Trạng thái hiển thị của phản hồi đã gửi. */
export function feedbackState(feedback: FeedbackView): FeedbackState {
  if (feedback.kind === "CONFIRM") return "confirmed";
  if (feedback.status === "OPEN") return "waiting";
  return feedback.decision === "ACCEPTED" ? "accepted" : "rejected";
}
