import { formatCurrency, formatNumber } from "@/lib/format";
import { booleanOf } from "./conversation";

/**
 * Đơn vị hiển thị của từng tham số chính sách được phép đưa vào câu trả lời (khớp PolicyParameterWhitelist ở backend).
 * Người dùng chỉ thấy nhãn + giá trị có đơn vị, không thấy tên khóa kỹ thuật. Thêm khóa vào danh sách trắng thì phải
 * thêm ở đây và nhãn vi/en (PolicyQa.parameters.labels): khóa thiếu nhãn sẽ không được hiển thị.
 */
export type ParameterUnit =
  | "days"
  | "hours"
  | "minutes"
  | "times"
  /** Số nguyên đã là phần trăm (50 → 50%). */
  | "percent"
  /** Tỷ lệ thập phân (0.08 → 8%). */
  | "rate"
  | "vnd"
  /** Bội số, ví dụ "20 lần". */
  | "multiple"
  /** Hệ số nhân, ví dụ "×1.5". */
  | "multiplier"
  | "boolean"
  | "text";

export const PARAMETER_UNITS: Record<string, ParameterUnit> = {
  "leave.annual_days": "days",
  "leave.min_notice_days": "days",
  "leave.backdate_max_days": "days",
  "leave.max_request_days": "days",
  "remote.max_personal_days_per_week": "days",
  "remote.max_personal_days_per_month": "days",
  "remote.min_notice_days": "days",
  "remote.allow_probation": "boolean",
  "remote.allow_intern": "boolean",
  "attendance.remote_requires_punch": "boolean",
  "attendance.remote_min_span_percent": "percent",
  "attendance.min_span_percent": "percent",
  "calendar.work_start": "text",
  "schedule.start_earliest": "text",
  "schedule.start_latest": "text",
  "schedule.start_step_minutes": "minutes",
  "schedule.effective_delay_days": "days",
  "schedule.max_changes_per_month": "times",
  "approval.leave_hr_step_min_days": "days",
  "payroll.rate_social": "rate",
  "payroll.rate_health": "rate",
  "payroll.rate_unemployment": "rate",
  "payroll.base_salary": "vnd",
  "payroll.region_min_wage": "vnd",
  "payroll.insurance_cap_multiple": "multiple",
  "payroll.personal_deduction": "vnd",
  "payroll.dependent_deduction": "vnd",
  "payroll.tax_bracket_1_upto": "vnd",
  "payroll.tax_bracket_2_upto": "vnd",
  "payroll.tax_bracket_3_upto": "vnd",
  "payroll.tax_bracket_4_upto": "vnd",
  "payroll.tax_bracket_1_rate": "rate",
  "payroll.tax_bracket_2_rate": "rate",
  "payroll.tax_bracket_3_rate": "rate",
  "payroll.tax_bracket_4_rate": "rate",
  "payroll.tax_bracket_5_rate": "rate",
  "payroll.lunch_exempt_cap": "vnd",
  "payroll.hours_per_day": "hours",
  "payroll.ot_rate_normal": "multiplier",
  "payroll.ot_rate_weekly_off": "multiplier",
  "payroll.ot_rate_holiday": "multiplier",
  "payroll.ot_monthly_hour_cap": "hours",
  "payroll.ot_yearly_hour_cap": "hours",
  "payroll.complaint_days": "days",
};

export const PARAMETER_KEYS = Object.keys(PARAMETER_UNITS);

/** Hàm dịch trong namespace PolicyQa.parameters (rút gọn để dùng được cả với createTranslator trong test). */
export type ParameterTranslate = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

/** next-intl không cho dấu chấm trong khóa dịch: leave.annual_days → leave_annual_days. */
export function labelKey(key: string): string {
  return `labels.${key.replaceAll(".", "_")}`;
}

/** Nhãn dễ hiểu của tham số, hoặc null nếu chưa có (khi đó không hiển thị tham số đó). */
export function parameterLabel(key: string, t: ParameterTranslate): string | null {
  return key in PARAMETER_UNITS && t.has(labelKey(key)) ? t(labelKey(key)) : null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Giá trị kèm đơn vị. Giá trị không đọc được thì giữ nguyên. */
export function formatParameterValue(key: string, raw: string, t: ParameterTranslate): string {
  const unit = PARAMETER_UNITS[key] ?? "text";
  if (unit === "boolean") {
    const flag = booleanOf(raw);
    return flag === null ? raw : flag ? t("yes") : t("no");
  }
  const number = Number(raw);
  if (unit === "text" || raw.trim() === "" || !Number.isFinite(number)) return raw;
  switch (unit) {
    case "vnd":
      return formatCurrency(number);
    case "rate":
      return t("units.percent", { value: formatNumber(round2(number * 100)) });
    case "percent":
    case "multiple":
    case "multiplier":
    case "days":
    case "hours":
    case "minutes":
    case "times":
      return t(`units.${unit}`, { value: number });
    default:
      return raw;
  }
}

// "Tham số `a.b`, `c.d` (mặc định 50)." đứng đầu câu: bỏ cả cụm, vì người dùng không cần tên khóa
const PARAMETER_SENTENCE = /(^|[.!?]\s+|\n\s*)tham số\s+(?:`[^`]+`(?:,\s*)?)+(?:\s*\([^)]*\))?\.?/gi;
const BACKTICKED = /`([^`\s]+)`/g;

/**
 * Đoạn trích hiển thị cho người dùng: bỏ câu "Tham số `...`" và thay tên khóa còn lại bằng nhãn (khóa không có nhãn thì
 * bỏ). Tên file như `leave.md` giữ nguyên. Chỉ đổi cách hiển thị, nội dung gốc không đổi.
 */
export function humanizeExcerpt(text: string, t: ParameterTranslate): string {
  return text
    .replace(PARAMETER_SENTENCE, "$1")
    .replace(BACKTICKED, (match, code: string) => {
      if (code.endsWith(".md") || !code.includes(".")) return match;
      return parameterLabel(code, t) ?? "";
    })
    .replace(/[ \t]+$/gm, "")
    .replace(/(\S) {2,}/g, "$1 ");
}

/** Tiêu đề tài liệu cho huy hiệu nguồn: phần trước dấu "›" của mục ("Quy định nghỉ phép › 2. Quỹ phép năm"). */
export function sourceTitle(section: string, file: string): string {
  const title = section.split("›")[0]?.trim();
  return title ? title : file;
}
