import type { Messages } from "next-intl";
import { z } from "zod";
import type { DurationUnit } from "./types";
import { isTime, toIsoDuration } from "./values";

type ValidationKey = keyof Messages["Policies"]["Validation"];
/** Hàm dịch của namespace "Policies.Validation". */
export type PoliciesValidationTranslator = (key: ValidationKey, values?: Record<string, string | number>) => string;

/** Khớp AddPolicyValueRequest của backend (@Size max 500). */
export const MAX_VALUE_LENGTH = 500;
/** Phạm vi "toàn công ty" trong ô chọn (Select không nhận null làm một lựa chọn). */
export const COMPANY_SCOPE = "company";

const INTEGER_PATTERN = /^-?\d+$/;
const DECIMAL_PATTERN = /^-?\d+(?:[.,]\d+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type PolicyValueFormValues = {
  /** COMPANY_SCOPE hoặc id văn phòng. */
  scope: string;
  /** Chữ người dùng nhập; BOOLEAN là "true" / "false"; DURATION là số lượng (đơn vị ở `unit`). */
  value: string;
  unit: DurationUnit;
  /** "yyyy-MM-dd" */
  validFrom: string;
};

type Definition = { valueType: string; minValue: number | null; maxValue: number | null };

/**
 * Kiểm tra như backend (PolicyAdminService.validate) để báo lỗi ngay trên form: đúng kiểu, nằm trong min / max, ngày
 * hiệu lực từ hôm nay. `valueType` là kiểu dùng để nhập (effectiveValueType). `today` là "yyyy-MM-dd" giờ Việt Nam.
 */
export function policyValueSchema(t: PoliciesValidationTranslator, definition: Definition, today: string) {
  const { valueType, minValue, maxValue } = definition;
  return z
    .object({
      scope: z.string().min(1),
      value: z.string().trim().min(1, t("required")).max(MAX_VALUE_LENGTH, t("tooLong", { max: MAX_VALUE_LENGTH })),
      unit: z.enum(["SECONDS", "MINUTES", "HOURS"]),
      validFrom: z
        .string()
        .regex(DATE_PATTERN, t("dateRequired"))
        .refine((date) => date >= today, t("pastDate")),
    })
    .superRefine(({ value }, ctx) => {
      const text = value.trim();
      if (!text) return;
      const issue = (message: string) => ctx.addIssue({ code: "custom", path: ["value"], message });

      if (valueType === "INTEGER" || valueType === "DECIMAL") {
        const pattern = valueType === "INTEGER" ? INTEGER_PATTERN : DECIMAL_PATTERN;
        if (!pattern.test(text)) return issue(t(valueType === "INTEGER" ? "notInteger" : "notNumber"));
        const number = Number(text.replace(",", "."));
        if (minValue !== null && number < minValue) return issue(t("belowMin", { min: minValue }));
        if (maxValue !== null && number > maxValue) return issue(t("aboveMax", { max: maxValue }));
      } else if (valueType === "TIME") {
        if (!isTime(text)) issue(t("invalidTime"));
      } else if (valueType === "DURATION") {
        if (!/^\d+$/.test(text) || Number(text) <= 0) issue(t("durationPositive"));
      } else if (valueType === "BOOLEAN") {
        if (text !== "true" && text !== "false") issue(t("required"));
      }
    });
}

/** Giá trị gửi backend theo kiểu: DURATION → ISO-8601 ("PT2M"), DECIMAL "0,6" → "0.6", còn lại bỏ khoảng trắng đầu cuối. */
export function toApiValue(valueType: string, { value, unit }: Pick<PolicyValueFormValues, "value" | "unit">): string {
  const text = value.trim();
  if (valueType === "DURATION") return toIsoDuration(Number(text), unit);
  if (valueType === "DECIMAL") return text.replace(",", ".");
  return text;
}
