import type { PayrollInput, PayrollInputCode, PayrollPeriodStatus } from "./types";

/** Bốn nhóm (tab) của màn Nhập khoản. */
export type InputGroup = "bonus" | "adjust" | "ot" | "kpi";

export const INPUT_GROUPS: Record<InputGroup, PayrollInputCode[]> = {
  bonus: ["BONUS", "KPI_BONUS"],
  adjust: ["ADJUST"],
  ot: ["OT_HOURS_NORMAL", "OT_HOURS_WEEKLY_OFF", "OT_HOURS_HOLIDAY"],
  kpi: ["KPI_COEFFICIENT"],
};

export const INPUT_GROUP_ORDER: InputGroup[] = ["bonus", "adjust", "ot", "kpi"];

/** Khoản tiền (VND nguyên) dùng `amount`; giờ OT và hệ số KPI dùng `quantity`. */
export const isMoneyCode = (code: PayrollInputCode) => code === "BONUS" || code === "KPI_BONUS" || code === "ADJUST";

export const isOvertimeCode = (code: PayrollInputCode) => code.startsWith("OT_HOURS_");

/** Giá trị số của một dòng (amount hoặc quantity). */
export const inputValue = (input: PayrollInput): number | null => (isMoneyCode(input.code) ? input.amount : input.quantity);

/** Hệ số KPI có tối đa 4 số lẻ nên không dùng formatNumber chung (3 số lẻ). */
export function formatQuantity(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}

export const MIN_INPUT_REASON = 10;
export const MAX_INPUT_REASON = 1000;
export const MAX_MONEY = 100_000_000_000;
export const MAX_OT_HOURS = 744;

/**
 * Kỳ còn nhập được khi: người dùng có payroll:manage, kỳ chưa APPROVED/PUBLISHED/CLOSED và không chờ duyệt.
 * (Chỉ để ẩn nút; backend vẫn kiểm.)
 */
export function inputsLockReason(
  status: PayrollPeriodStatus,
  pendingApproval: boolean,
): "pendingApproval" | "closedPeriod" | null {
  if (pendingApproval) return "pendingApproval";
  return status === "APPROVED" || status === "PUBLISHED" || status === "CLOSED" ? "closedPeriod" : null;
}

export const isValidReason = (reason: string) =>
  reason.trim().length >= MIN_INPUT_REASON && reason.trim().length <= MAX_INPUT_REASON;

/** Chuỗi người dùng gõ thành số (chấp nhận dấu phẩy thập phân); null nếu không phải số hữu hạn. */
export function parseNumber(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (clean === "" || !/^[+-]?\d+(\.\d+)?$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

function decimals(text: string): number {
  const clean = text.trim().replace(",", ".");
  const dot = clean.indexOf(".");
  return dot < 0 ? 0 : clean.length - dot - 1;
}

export type InputFormValues = {
  employeeId: string;
  code: PayrollInputCode;
  value: string;
  sourceMonth: string;
  reason: string;
};

export type InputErrorKey =
  | "employeeRequired"
  | "employeeInvalid"
  | "valueRequired"
  | "valueInteger"
  | "valueNegative"
  | "valueZero"
  | "valueTooLarge"
  | "otDecimals"
  | "otTooLarge"
  | "kpiDecimals"
  | "sourceRequired"
  | "sourceInvalid"
  | "sourceSame"
  | "reasonShort"
  | "reasonLong";

export type InputErrors = Partial<Record<"employeeId" | "value" | "sourceMonth" | "reason", InputErrorKey>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kiểm form theo mã khoản, cùng luật với PayrollInputService (backend kiểm lại). Rỗng = hợp lệ.
 * `periodMonth` là kỳ đang nhập (kỳ gốc của ADJUST phải khác). `needEmployee` false khi sửa (nhân viên không đổi).
 * Trần hệ số KPI là tham số công ty nên FE không kiểm, chỉ kiểm không âm và số lẻ.
 */
export function validateInput(values: InputFormValues, periodMonth: string, needEmployee = true): InputErrors {
  const errors: InputErrors = {};
  if (needEmployee) {
    if (values.employeeId.trim() === "") errors.employeeId = "employeeRequired";
    else if (!UUID.test(values.employeeId.trim())) errors.employeeId = "employeeInvalid";
  }

  const number = parseNumber(values.value);
  const { code } = values;
  if (number === null) {
    errors.value = "valueRequired";
  } else if (isMoneyCode(code)) {
    if (decimals(values.value) > 0) errors.value = "valueInteger";
    else if (Math.abs(number) > MAX_MONEY) errors.value = "valueTooLarge";
    else if (code === "ADJUST" ? number === 0 : number < 0) errors.value = code === "ADJUST" ? "valueZero" : "valueNegative";
  } else if (number < 0) {
    errors.value = "valueNegative";
  } else if (isOvertimeCode(code)) {
    if (decimals(values.value) > 2) errors.value = "otDecimals";
    else if (number > MAX_OT_HOURS) errors.value = "otTooLarge";
  } else if (decimals(values.value) > 4) {
    errors.value = "kpiDecimals";
  }

  if (code === "ADJUST") {
    const source = values.sourceMonth.trim();
    if (source === "") errors.sourceMonth = "sourceRequired";
    else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(source)) errors.sourceMonth = "sourceInvalid";
    else if (source === periodMonth) errors.sourceMonth = "sourceSame";
  }

  const reason = values.reason.trim();
  if (reason.length < MIN_INPUT_REASON) errors.reason = "reasonShort";
  else if (reason.length > MAX_INPUT_REASON) errors.reason = "reasonLong";
  return errors;
}

/** Thân request tạo/sửa từ giá trị form đã hợp lệ. */
export function buildInputBody(values: InputFormValues): {
  amount?: number;
  quantity?: number;
  adjustSourceMonth?: string;
  reason: string;
} {
  const number = parseNumber(values.value) ?? 0;
  const body: { amount?: number; quantity?: number; adjustSourceMonth?: string; reason: string } = {
    reason: values.reason.trim(),
  };
  if (isMoneyCode(values.code)) body.amount = number;
  else body.quantity = number;
  if (values.code === "ADJUST") body.adjustSourceMonth = values.sourceMonth.trim();
  return body;
}

/** Id rút gọn khi backend chưa trả tên. */
export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : "—");
