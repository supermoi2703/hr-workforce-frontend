import { describe, expect, it } from "vitest";
import { buildInputBody, inputsLockReason, parseNumber, validateInput, type InputFormValues } from "./inputs";

const EMP = "123e4567-e89b-12d3-a456-426614174000";
const base: InputFormValues = { employeeId: EMP, code: "BONUS", value: "2000000", sourceMonth: "", reason: "Hoàn thành giai đoạn 1" };
const check = (part: Partial<InputFormValues>, month = "2026-11", needEmployee = true) =>
  validateInput({ ...base, ...part }, month, needEmployee);

describe("validateInput", () => {
  it("dòng hợp lệ không có lỗi", () => {
    expect(check({})).toEqual({});
  });

  it("thưởng không âm, ADJUST khác 0 nhưng được âm", () => {
    expect(check({ value: "-1" }).value).toBe("valueNegative");
    expect(check({ code: "ADJUST", value: "0", sourceMonth: "2026-10" }).value).toBe("valueZero");
    expect(check({ code: "ADJUST", value: "-909091", sourceMonth: "2026-10" })).toEqual({});
  });

  it("tiền phải là số nguyên", () => {
    expect(check({ value: "1000,5" }).value).toBe("valueInteger");
  });

  it("ADJUST cần kỳ gốc khác kỳ đang nhập", () => {
    expect(check({ code: "ADJUST", value: "5", sourceMonth: "" }).sourceMonth).toBe("sourceRequired");
    expect(check({ code: "ADJUST", value: "5", sourceMonth: "2026-11" }).sourceMonth).toBe("sourceSame");
    expect(check({ code: "ADJUST", value: "5", sourceMonth: "2026-13" }).sourceMonth).toBe("sourceInvalid");
  });

  it("giờ OT tối đa 2 số lẻ và 744 giờ", () => {
    expect(check({ code: "OT_HOURS_NORMAL", value: "10,5" })).toEqual({});
    expect(check({ code: "OT_HOURS_HOLIDAY", value: "1.255" }).value).toBe("otDecimals");
    expect(check({ code: "OT_HOURS_WEEKLY_OFF", value: "745" }).value).toBe("otTooLarge");
  });

  it("hệ số KPI tối đa 4 số lẻ, không âm", () => {
    expect(check({ code: "KPI_COEFFICIENT", value: "1.1234" })).toEqual({});
    expect(check({ code: "KPI_COEFFICIENT", value: "1.12345" }).value).toBe("kpiDecimals");
    expect(check({ code: "KPI_COEFFICIENT", value: "-0.1" }).value).toBe("valueNegative");
  });

  it("lý do cần ít nhất 10 ký tự sau khi cắt khoảng trắng", () => {
    expect(check({ reason: "   ngắn    " }).reason).toBe("reasonShort");
  });

  it("nhân viên bắt buộc khi thêm, bỏ qua khi sửa", () => {
    expect(check({ employeeId: "" }).employeeId).toBe("employeeRequired");
    expect(check({ employeeId: "abc" }).employeeId).toBe("employeeInvalid");
    expect(check({ employeeId: "" }, "2026-11", false)).toEqual({});
  });
});

describe("helpers", () => {
  it("parseNumber chấp nhận dấu phẩy, từ chối chữ", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });

  it("buildInputBody: tiền vào amount, giờ/hệ số vào quantity, kỳ gốc chỉ cho ADJUST", () => {
    expect(buildInputBody(base)).toEqual({ amount: 2000000, reason: "Hoàn thành giai đoạn 1" });
    expect(buildInputBody({ ...base, code: "OT_HOURS_NORMAL", value: "8,5" })).toEqual({ quantity: 8.5, reason: "Hoàn thành giai đoạn 1" });
    expect(buildInputBody({ ...base, code: "ADJUST", sourceMonth: "2026-10" }).adjustSourceMonth).toBe("2026-10");
  });

  it("inputsLockReason", () => {
    expect(inputsLockReason("CALCULATED", true)).toBe("pendingApproval");
    expect(inputsLockReason("APPROVED", false)).toBe("closedPeriod");
    expect(inputsLockReason("CALCULATED", false)).toBeNull();
  });
});
