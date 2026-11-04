import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import { getPolicyError } from "./error-messages";
import { policyValueSchema, toApiValue, type PolicyValueFormValues } from "./schemas";
import type { PolicySummary, PolicyValue } from "./types";
import {
  effectiveValueType,
  findSameDay,
  formatPolicyValue,
  formatRange,
  groupByModule,
  groupValues,
  isTime,
  parseIsoDuration,
  policyMessageKey,
  toIsoDuration,
} from "./values";

const OFFICE = "office-hn";
const TODAY = "2026-11-03";

const value = (id: string, validFrom: string, officeId: string | null = null, raw = "1"): PolicyValue => ({
  id,
  officeId,
  value: raw,
  validFrom,
  inEffect: validFrom <= TODAY,
});

describe("isTime / effectiveValueType", () => {
  it("chỉ nhận đúng HH:mm 24 giờ, như kiểu TIME của backend", () => {
    expect(isTime("08:30")).toBe(true);
    expect(isTime("23:59")).toBe(true);
    for (const invalid of ["8:30", "8h30", "24:00", "08:60", "08:30:00", ""]) expect(isTime(invalid)).toBe(false);
  });

  it("khóa STRING mà mọi giá trị là giờ thì nhập như TIME; kiểu khác giữ nguyên", () => {
    expect(effectiveValueType("STRING", ["08:30", "09:00"])).toBe("TIME");
    expect(effectiveValueType("STRING", ["08:30", "hello"])).toBe("STRING");
    expect(effectiveValueType("STRING", [null])).toBe("STRING");
    expect(effectiveValueType("INTEGER", ["08:30"])).toBe("INTEGER");
    expect(effectiveValueType("TIME", [])).toBe("TIME");
  });
});

describe("parseIsoDuration / toIsoDuration", () => {
  it("chọn đơn vị lớn nhất chia hết", () => {
    expect(parseIsoDuration("PT2M")).toEqual({ amount: 2, unit: "MINUTES" });
    expect(parseIsoDuration("PT90M")).toEqual({ amount: 90, unit: "MINUTES" });
    expect(parseIsoDuration("PT1H30M")).toEqual({ amount: 90, unit: "MINUTES" });
    expect(parseIsoDuration("PT48H")).toEqual({ amount: 48, unit: "HOURS" });
    expect(parseIsoDuration("P1D")).toEqual({ amount: 24, unit: "HOURS" });
    expect(parseIsoDuration("PT45S")).toEqual({ amount: 45, unit: "SECONDS" });
  });

  it("giá trị lạ trả null", () => {
    for (const invalid of ["2 minutes", "PT", "P", "PT1.5S", "-PT2M"]) expect(parseIsoDuration(invalid)).toBeNull();
  });

  it("đổi ngược ra ISO", () => {
    expect(toIsoDuration(2, "MINUTES")).toBe("PT2M");
    expect(toIsoDuration(8, "HOURS")).toBe("PT8H");
    expect(toIsoDuration(30, "SECONDS")).toBe("PT30S");
  });
});

describe("formatPolicyValue / formatRange", () => {
  const labels = {
    duration: (amount: number, unit: string) => `${amount} ${unit}`,
    yes: "Có",
    no: "Không",
    number: (n: number) => `#${n}`,
  };

  it("hiện theo kiểu, không đọc được thì hiện nguyên", () => {
    expect(formatPolicyValue("DURATION", "PT2M", labels)).toBe("2 MINUTES");
    expect(formatPolicyValue("DECIMAL", "0.45", labels)).toBe("#0.45");
    expect(formatPolicyValue("INTEGER", "12", labels)).toBe("#12");
    expect(formatPolicyValue("BOOLEAN", "true", labels)).toBe("Có");
    expect(formatPolicyValue("TIME", "08:30", labels)).toBe("08:30");
    expect(formatPolicyValue("DURATION", "abc", labels)).toBe("abc");
    expect(formatPolicyValue("INTEGER", null, labels)).toBe("—");
  });

  it("khoảng cho phép", () => {
    const n = (x: number) => String(x);
    expect(formatRange(1, 365, n)).toBe("1 – 365");
    expect(formatRange(0, null, n)).toBe("≥ 0");
    expect(formatRange(null, 30, n)).toBe("≤ 30");
    expect(formatRange(null, null, n)).toBeNull();
  });
});

describe("groupValues", () => {
  it("mỗi phạm vi: chưa tới ngày là sắp áp dụng, bản mới nhất đã tới ngày là đang áp dụng, còn lại đã thay thế", () => {
    const values = [
      value("old", "2000-01-01"),
      value("future", "2026-12-01"),
      value("now", "2026-06-01"),
      value("hn", "2026-11-03", OFFICE),
      value("hn-old", "2026-01-01", OFFICE),
    ];
    const { company, offices } = groupValues(values, TODAY);

    expect(company.map((v) => [v.id, v.status])).toEqual([
      ["future", "upcoming"],
      ["now", "current"],
      ["old", "superseded"],
    ]);
    expect(offices).toHaveLength(1);
    expect(offices[0].officeId).toBe(OFFICE);
    // Bắt đầu đúng hôm nay là đang áp dụng
    expect(offices[0].values.map((v) => v.status)).toEqual(["current", "superseded"]);
  });

  it("cờ inEffect không quyết định trạng thái", () => {
    const values = [value("a", "2026-01-01"), value("b", "2025-01-01")];
    expect(values.every((v) => v.inEffect)).toBe(true);
    expect(groupValues(values, TODAY).company.map((v) => v.status)).toEqual(["current", "superseded"]);
  });

  it("findSameDay theo đúng phạm vi", () => {
    const values = [value("c", "2026-12-01"), value("o", "2026-12-01", OFFICE)];
    expect(findSameDay(values, null, "2026-12-01")?.id).toBe("c");
    expect(findSameDay(values, OFFICE, "2026-12-01")?.id).toBe("o");
    expect(findSameDay(values, "other", "2026-12-01")).toBeUndefined();
  });
});

describe("groupByModule / policyMessageKey", () => {
  const summary = (key: string, ownerModule: string): PolicySummary => ({
    key,
    valueType: "INTEGER",
    description: "",
    ownerModule,
    minValue: null,
    maxValue: null,
    officeOverridable: false,
    currentValue: "1",
    officeOverrideCount: 0,
  });

  it("theo thứ tự module đã định, module lạ xếp cuối", () => {
    const groups = groupByModule([
      summary("face.match_high", "face"),
      summary("zeta.x", "zeta"),
      summary("leave.annual_days", "leave"),
      summary("approval.leave_hr_step_min_days", "approval"),
      summary("alpha.x", "alpha"),
    ]);
    expect(groups.map((g) => g.module)).toEqual(["approval", "leave", "face", "alpha", "zeta"]);
  });

  it("key dịch", () => {
    expect(policyMessageKey("face.match_high")).toBe("face_match_high");
  });

  it("mọi khóa đã biết có bản dịch", () => {
    const keys = Object.keys(en.Policies.keys);
    expect(keys).toContain(policyMessageKey("attendance.duplicate_punch_window"));
    expect(keys).toHaveLength(16);
  });
});

describe("policyValueSchema / toApiValue", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Policies.Validation" });
  const form = (overrides: Partial<PolicyValueFormValues>): PolicyValueFormValues => ({
    scope: "company",
    value: "5",
    unit: "MINUTES",
    validFrom: TODAY,
    ...overrides,
  });
  const check = (valueType: string, overrides: Partial<PolicyValueFormValues>, min: number | null = 1, max: number | null = 30) =>
    policyValueSchema(t, { valueType, minValue: min, maxValue: max }, TODAY).safeParse(form(overrides));

  it("số nguyên trong khoảng", () => {
    expect(check("INTEGER", { value: "12" }).success).toBe(true);
    expect(check("INTEGER", { value: "1.5" }).success).toBe(false);
    expect(check("INTEGER", { value: "0" }).success).toBe(false);
    expect(check("INTEGER", { value: "31" }).success).toBe(false);
    expect(check("INTEGER", { value: " " }).success).toBe(false);
  });

  it("số thập phân nhận cả dấu phẩy", () => {
    expect(check("DECIMAL", { value: "0,45" }, 0, 1).success).toBe(true);
    expect(check("DECIMAL", { value: "1.2" }, 0, 1).success).toBe(false);
    expect(check("DECIMAL", { value: "abc" }, 0, 1).success).toBe(false);
  });

  it("giờ, thời lượng", () => {
    expect(check("TIME", { value: "08:30" }, null, null).success).toBe(true);
    expect(check("TIME", { value: "8h30" }, null, null).success).toBe(false);
    expect(check("DURATION", { value: "2" }, null, null).success).toBe(true);
    expect(check("DURATION", { value: "0" }, null, null).success).toBe(false);
  });

  it("ngày hiệu lực không ở quá khứ", () => {
    expect(check("INTEGER", { validFrom: "2026-11-02" }).success).toBe(false);
    expect(check("INTEGER", { validFrom: "2026-12-01" }).success).toBe(true);
    expect(check("INTEGER", { validFrom: "" }).success).toBe(false);
  });

  it("giá trị gửi backend", () => {
    expect(toApiValue("DURATION", { value: "2", unit: "MINUTES" })).toBe("PT2M");
    expect(toApiValue("DECIMAL", { value: "0,45", unit: "MINUTES" })).toBe("0.45");
    expect(toApiValue("TIME", { value: " 08:30 ", unit: "MINUTES" })).toBe("08:30");
  });
});

describe("getPolicyError", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Policies.errors" });
  const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

  it("mã lỗi của API chính sách có câu riêng", () => {
    const error = new ApiError({ status: 409, code: "POLICY_VALUE_IN_EFFECT", message: "x" });
    expect(getPolicyError(error, t, tErrors)).toBe(en.Policies.errors.valueInEffect);
  });
});
