import type { PayrollPeriodStatus, PayrollWarning, RawWarning } from "./types";

export const LEGACY_WARNING = "LEGACY";

/** Các mã cảnh báo phiếu lương backend có thể trả; dùng cho bộ lọc "Loại cảnh báo". */
export const WARNING_CODES = [
  "W_GT_N",
  "KPI_MISSING",
  "KPI_NOT_LOCKED",
  "KPI_MANUAL_OVERRIDE",
  "KPI_FIRST_MONTH",
  "OT_MONTH_CAP",
  "OT_MANUAL_OVERRIDE",
  "NET_NEGATIVE",
  "NET_BELOW_MIN_WAGE",
  "NO_CONTRACT",
  "REGION_FALLBACK",
  "TIMESHEET_PENDING",
  "PAID_OUTSIDE_CONTRACT",
  LEGACY_WARNING,
] as const;

export function warningMessageKey(code: string, params?: Record<string, unknown> | null): string {
  if (code === "KPI_NOT_LOCKED" && params?.coefficient != null) {
    return "KPI_NOT_LOCKED_DETAIL";
  }
  if (code === "KPI_MANUAL_OVERRIDE" && params && Object.hasOwn(params, "systemCoefficient")) {
    return params.systemCoefficient == null ? "KPI_MANUAL_OVERRIDE_NO_SYSTEM" : "KPI_MANUAL_OVERRIDE_DETAIL";
  }
  return code;
}

/** Chuẩn hóa cảnh báo: backend cũ trả chuỗi, backend mới trả {code, params, text}. */
export function normalizeWarnings(raw: RawWarning[] | null | undefined): PayrollWarning[] {
  return (raw ?? []).map((item) =>
    typeof item === "string"
      ? { code: LEGACY_WARNING, params: null, text: item }
      : { code: item.code, params: item.params ?? null, text: item.text ?? null },
  );
}

/** Tham số cảnh báo thành giá trị an toàn cho câu dịch (chuỗi hoặc số). */
export function warningParams(params: Record<string, unknown> | null | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "number" || typeof value === "string") out[key] = value;
    else if (value !== null && value !== undefined) out[key] = String(value);
  }
  return out;
}

/** % chênh so với tháng trước, làm tròn 1 chữ số; null khi không có kỳ trước hoặc kỳ trước bằng 0. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

const EXPORTABLE: PayrollPeriodStatus[] = ["CALCULATED", "APPROVED", "PUBLISHED", "CLOSED"];

/** Chỉ xuất Excel khi kỳ đã tính lương và có ít nhất một phiếu. */
export function canExportSheet(status: PayrollPeriodStatus, employees: number): boolean {
  return EXPORTABLE.includes(status) && employees > 0;
}

/** Nút Duyệt/Trả lại bị khóa: "submitter" khi chính người gửi đang xem, ngược lại "notPending". */
export function decideBlockReason(canDecide: boolean, submittedBy: string | null, userId: string | null | undefined): "submitter" | "notPending" | null {
  if (canDecide) return null;
  return submittedBy !== null && submittedBy === userId ? "submitter" : "notPending";
}
