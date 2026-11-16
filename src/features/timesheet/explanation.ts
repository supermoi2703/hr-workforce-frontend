import type { Explanation, PeriodStatus, TimesheetDay, TimesheetStatus } from "./types";

/** Backend cho giải trình ngày đã qua trong tối đa 7 ngày lịch (AttendanceExplanationService.WINDOW_DAYS). */
export const EXPLAIN_WINDOW_DAYS = 7;

/** Trạng thái ngày giải trình được (ELIGIBLE của backend). */
const EXPLAINABLE: TimesheetStatus[] = ["ABSENT", "MISSING_OUT", "LATE", "EARLY", "LATE_EARLY"];

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Ngày thiếu giờ ra chưa có quyết định của HR: paidUnits null (hoặc chưa tính). */
export function awaitingHrDecision(day: Pick<TimesheetDay, "status" | "paidUnits"> | undefined): boolean {
  return !!day && day.status === "MISSING_OUT" && day.paidUnits == null;
}

/** Giải trình đang chờ xử lý của một ngày, nếu có. */
export function pendingExplanationOn(explanations: Explanation[], date: string): Explanation | undefined {
  return explanations.find((e) => e.workDate === date && e.status === "PENDING");
}

/** Giải trình gần nhất của một ngày (danh sách backend mới nhất trước). */
export function latestExplanationOn(explanations: Explanation[], date: string): Explanation | undefined {
  return explanations.find((e) => e.workDate === date);
}

/**
 * Có nút "Gửi giải trình" không: ngày làm việc đã qua trong hạn 7 ngày, trạng thái giải trình được, chưa có giải
 * trình đang chờ, và (với thiếu giờ ra) HR chưa quyết. Backend vẫn kiểm lại, kể cả kỳ công đã chốt.
 */
export function canExplain(
  day: TimesheetDay | undefined,
  today: string,
  explanations: Explanation[],
): boolean {
  if (!day || day.dayType !== "WORKING_DAY" || !EXPLAINABLE.includes(day.status)) return false;
  if (day.workDate >= today) return false;
  if (daysBetween(day.workDate, today) > EXPLAIN_WINDOW_DAYS) return false;
  if (pendingExplanationOn(explanations, day.workDate)) return false;
  if (day.status === "MISSING_OUT" && day.paidUnits != null) return false;
  return true;
}

/** Ghép ngày "2026-11-10" và giờ "08:30" thành thời điểm ISO (múi giờ của trình duyệt). */
export function toInstant(date: string, time: string): string | null {
  if (!time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** Giờ khai hợp lệ: có ít nhất một giờ; nếu có cả hai thì giờ ra phải sau giờ vào. */
export function isValidClaim(claimedIn: string, claimedOut: string): boolean {
  if (!claimedIn && !claimedOut) return false;
  return !claimedIn || !claimedOut || claimedOut > claimedIn;
}

const LOCKED_TONE: Record<PeriodStatus, "success" | "warning"> = { OPEN: "warning", LOCKED: "success" };

/** Màu nhãn trạng thái kỳ công: đang mở vàng, đã chốt xanh. */
export function periodTone(status: PeriodStatus): "success" | "warning" {
  return LOCKED_TONE[status];
}

/** Kỳ có chốt được không theo API: chưa khóa, backend báo canLock và không còn ngày chặn. */
export function canLockPeriod(row: { status: PeriodStatus; canLock: boolean; blockerCount: number }): boolean {
  return row.status === "OPEN" && row.canLock && row.blockerCount === 0;
}
