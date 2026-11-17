import type { PeriodChecks } from "./types";

/** Có blocker thì khóa nút xác nhận. Không có dữ liệu kiểm tra (backend cũ) thì không chặn. */
export function hasBlockers(checks: PeriodChecks | null | undefined): boolean {
  return (checks?.blockers.length ?? 0) > 0;
}

/** Mã cảnh báo F1 (dạng "n phiếu: nhãn") khác với mã kiểm tra riêng của bước. */
export const CHECK_ONLY_CODES = ["TIMESHEET_NOT_LOCKED", "OFFICE_REGION_MISSING", "NO_CONTRACT_WITH_WORK", "PENDING_APPROVAL", "SINGLE_APPROVER", "RECIPIENTS", "INVALID_STATUS", "NO_APPROVER"];

export function isSheetWarning(code: string): boolean {
  return !CHECK_ONLY_CODES.includes(code);
}
