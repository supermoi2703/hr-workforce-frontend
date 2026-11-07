import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { getContractError } from "./error-messages";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import { formatMoneyInput, moneyToInput, parseMoney } from "./money";
import {
  currentSalary,
  getContractActions,
  isSalaryEditable,
  minSalaryDate,
  nextDay,
  renewalDefaults,
  salaryStatuses,
} from "./rules";
import {
  amountsToForm,
  contractSchema,
  EMPTY_AMOUNTS,
  endSchema,
  salarySchema,
  toAmounts,
  toCreateRequest,
  toEndRequest,
  toSalaryRequest,
  toUpdateRequest,
  type ContractFormValues,
} from "./schemas";
import { CONTRACT_STATES, CONTRACT_TYPES, type ContractDetail, type ContractListItem, type Salary } from "./types";

const tValidation = createTranslator({ locale: "en", messages: en, namespace: "Contracts.Validation" });
const tContractErrors = createTranslator({ locale: "en", messages: en, namespace: "Contracts.Errors" });
const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

const TODAY = "2026-11-06";
const OFFICE = "00000000-0000-0000-0000-00000000d001";

const messagesOf = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];
const pathsOf = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

const contract = (patch: Partial<ContractListItem> = {}): ContractListItem => ({
  id: "c1",
  employeeId: "e1",
  employeeCode: "NV00001",
  employeeName: "Nguyễn Văn An",
  contractNumber: "HD-1",
  type: "FIXED_TERM",
  state: "ACTIVE",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  ...patch,
});

const salary = (id: string, effectiveFrom: string, patch: Partial<Salary> = {}): Salary => ({
  id,
  effectiveFrom,
  baseSalary: 20_000_000,
  lunchAllowance: 730_000,
  otherAllowance: 0,
  insuranceSalary: 20_000_000,
  reason: null,
  replaced: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...patch,
});

describe("bản dịch", () => {
  it("đủ nhãn cho mọi loại và trạng thái hợp đồng ở cả en / vi", () => {
    for (const messages of [en, vi]) {
      for (const type of CONTRACT_TYPES) expect(messages.Contracts.types).toHaveProperty(type);
      for (const state of CONTRACT_STATES) expect(messages.Contracts.states).toHaveProperty(state);
    }
  });
});

describe("getContractActions", () => {
  const can = (...permissions: string[]) => (permission: string) => permissions.includes(permission);
  const manage = can("contract:manage", "employee:read");

  it("chưa bắt đầu: sửa / xóa, không kết thúc sớm, không gia hạn", () => {
    expect(getContractActions(contract({ state: "UPCOMING" }), manage)).toMatchObject({
      edit: true,
      remove: true,
      end: false,
      renew: false,
      addSalary: true,
    });
  });

  it("đang chạy: kết thúc sớm, gia hạn; không sửa / xóa", () => {
    expect(getContractActions(contract(), manage)).toMatchObject({ edit: false, remove: false, end: true, renew: true });
  });

  it("không thời hạn đang chạy thì không có gì để gia hạn", () => {
    expect(getContractActions(contract({ type: "INDEFINITE", endDate: null }), manage).renew).toBe(false);
  });

  it("đã kết thúc: gia hạn và thêm mức (sửa hồi tố), không kết thúc sớm", () => {
    expect(getContractActions(contract({ state: "ENDED" }), manage)).toMatchObject({
      end: false,
      renew: true,
      addSalary: true,
    });
  });

  it("chỉ có contract:read: không có thao tác ghi, không link sang hồ sơ nếu thiếu employee:read", () => {
    expect(getContractActions(contract(), can("contract:read"))).toEqual({
      edit: false,
      remove: false,
      end: false,
      addSalary: false,
      renew: false,
      viewEmployee: false,
      viewAuditLog: false,
    });
  });
});

describe("mức lương", () => {
  it("isSalaryEditable khớp backend: chỉ mức tương lai, trừ mức bắt đầu hợp đồng", () => {
    const upcoming = contract({ state: "UPCOMING", startDate: "2026-12-01" });
    expect(isSalaryEditable(salary("s", "2026-12-15"), upcoming, TODAY)).toBe(true);
    expect(isSalaryEditable(salary("s", "2026-12-01"), upcoming, TODAY)).toBe(false);
    expect(isSalaryEditable(salary("s", TODAY), contract(), TODAY)).toBe(false);
    expect(isSalaryEditable(salary("s", "2026-10-01"), contract(), TODAY)).toBe(false);
  });

  it("salaryStatuses: mức mới nhất đã tới ngày là current, cùng ngày thì bỏ qua mức bị thay thế", () => {
    const salaries = [
      salary("future", "2026-12-01"),
      salary("fix", "2026-06-01", { reason: "Nhập sai" }),
      salary("typo", "2026-06-01", { replaced: true }),
      salary("first", "2026-01-01"),
    ];
    expect(Object.fromEntries(salaryStatuses(salaries, TODAY))).toEqual({
      future: "upcoming",
      fix: "current",
      typo: "replaced",
      first: "past",
    });
    expect(currentSalary(salaries, TODAY)?.id).toBe("fix");
  });

  it("chưa tới mức nào thì không có mức đang áp dụng", () => {
    expect(currentSalary([salary("s", "2026-12-01")], TODAY)).toBeUndefined();
  });

  it("minSalaryDate: hợp đồng chưa bắt đầu phải sau ngày bắt đầu (mức đầu tiên sửa qua hợp đồng)", () => {
    expect(minSalaryDate(contract({ state: "UPCOMING", startDate: "2026-12-01" }))).toBe("2026-12-02");
    expect(minSalaryDate(contract())).toBe("2026-01-01");
  });
});

describe("gia hạn", () => {
  it("nextDay qua tháng, qua năm, năm nhuận", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });

  it("điền sẵn cùng loại, nối tiếp ngày cuối, mức lương đang áp dụng", () => {
    const detail: ContractDetail = {
      contract: contract(),
      salaries: [salary("new", "2026-06-01", { baseSalary: 25_000_000 }), salary("old", "2026-01-01")],
      version: 1,
    };
    const defaults = renewalDefaults(detail, TODAY);
    expect(defaults).toMatchObject({ type: "FIXED_TERM", startDate: "2027-01-01" });
    expect(defaults.salary?.id).toBe("new");
  });
});

describe("số tiền", () => {
  it("gõ tới đâu thêm dấu chấm tới đó, bỏ chữ và số 0 đầu, tối đa 15 chữ số", () => {
    expect(formatMoneyInput("15000000")).toBe("15.000.000");
    expect(formatMoneyInput("1a2b3")).toBe("123");
    expect(formatMoneyInput("000")).toBe("0");
    expect(formatMoneyInput("")).toBe("");
    expect(parseMoney(formatMoneyInput("12345678901234567890"))).toBe(123_456_789_012_345);
  });

  it("parseMoney: ô trống → null, không nhầm với 0", () => {
    expect(parseMoney("15.000.000")).toBe(15_000_000);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("")).toBeNull();
  });

  it("toAmounts: ô trống gửi null để backend hiểu phụ cấp = 0, bảo hiểm = lương cơ bản", () => {
    expect(toAmounts({ ...EMPTY_AMOUNTS, baseSalary: "20.000.000", lunchAllowance: "730.000" })).toEqual({
      baseSalary: 20_000_000,
      lunchAllowance: 730_000,
      otherAllowance: null,
      insuranceSalary: null,
    });
  });

  it("số từ backend → ô nhập", () => {
    expect(moneyToInput(20_000_000)).toBe("20.000.000");
    expect(amountsToForm(salary("s", TODAY)).otherAllowance).toBe("0");
    expect(amountsToForm(undefined)).toEqual(EMPTY_AMOUNTS);
  });
});

describe("contractSchema", () => {
  const schema = contractSchema(tValidation, "2026-01-15");
  const valid: ContractFormValues = {
    contractNumber: " HD-1 ",
    type: "FIXED_TERM",
    startDate: "2026-02-01",
    endDate: "2027-01-31",
    salary: { ...EMPTY_AMOUNTS, baseSalary: "20.000.000" },
  };

  it("hợp lệ; thiếu lương cơ bản hoặc bằng 0 thì báo", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(messagesOf(schema.safeParse({ ...valid, salary: EMPTY_AMOUNTS }))).toEqual([
      en.Contracts.Validation.salaryRequired,
    ]);
    expect(pathsOf(schema.safeParse({ ...valid, salary: { ...EMPTY_AMOUNTS, baseSalary: "0" } }))).toEqual([
      "salary.baseSalary",
    ]);
  });

  it("loại có thời hạn bắt buộc ngày kết thúc, không trước ngày bắt đầu", () => {
    expect(pathsOf(schema.safeParse({ ...valid, endDate: "" }))).toEqual(["endDate"]);
    expect(messagesOf(schema.safeParse({ ...valid, endDate: "2026-01-31" }))).toEqual([
      en.Contracts.Validation.endBeforeStart,
    ]);
  });

  it("không thời hạn: không cần ngày kết thúc và không gửi ngày cũ còn trong ô", () => {
    const values = { ...valid, type: "INDEFINITE" as const };
    expect(schema.safeParse({ ...values, endDate: "" }).success).toBe(true);
    expect(toCreateRequest(values, "e1")).toMatchObject({ employeeId: "e1", contractNumber: "HD-1", endDate: null });
  });

  it("không bắt đầu trước ngày vào làm (khi biết ngày vào làm)", () => {
    const early = { ...valid, startDate: "2026-01-14" };
    expect(messagesOf(schema.safeParse(early))).toEqual([en.Contracts.Validation.beforeHireDate]);
    expect(contractSchema(tValidation).safeParse(early).success).toBe(true);
  });

  it("sửa gửi kèm version", () => {
    expect(toUpdateRequest(valid, 4)).toMatchObject({ version: 4, type: "FIXED_TERM", endDate: "2027-01-31" });
  });
});

describe("salarySchema", () => {
  const schema = salarySchema(tValidation, { min: "2026-01-01", max: "2026-12-31" }, TODAY);
  const amounts = { ...EMPTY_AMOUNTS, baseSalary: "25.000.000" };

  it("mức tương lai không cần lý do", () => {
    expect(schema.safeParse({ effectiveFrom: "2026-12-01", amounts, reason: "" }).success).toBe(true);
  });

  it("mức từ hôm nay trở về trước bắt buộc lý do", () => {
    expect(pathsOf(schema.safeParse({ effectiveFrom: TODAY, amounts, reason: " " }))).toEqual(["reason"]);
    expect(schema.safeParse({ effectiveFrom: "2026-06-01", amounts, reason: "Tăng hồi tố" }).success).toBe(true);
  });

  it("ngoài thời hạn hợp đồng thì báo ở ô ngày", () => {
    expect(pathsOf(schema.safeParse({ effectiveFrom: "2027-01-01", amounts, reason: "" }))).toEqual(["effectiveFrom"]);
  });

  it("hợp đồng không thời hạn: không có giới hạn trên", () => {
    const open = salarySchema(tValidation, { min: "2026-01-01", max: null }, TODAY);
    expect(open.safeParse({ effectiveFrom: "2030-01-01", amounts, reason: "" }).success).toBe(true);
  });

  it("lý do trống gửi null", () => {
    expect(toSalaryRequest({ effectiveFrom: "2026-12-01", amounts, reason: " " }).reason).toBeNull();
  });
});

describe("endSchema", () => {
  it("ngày mới từ ngày bắt đầu tới trước ngày cuối hiện tại, bắt buộc lý do", () => {
    const schema = endSchema(tValidation, "2026-01-01", "2026-12-31");
    expect(schema.safeParse({ endDate: "2026-06-30", reason: "Thỏa thuận" }).success).toBe(true);
    expect(pathsOf(schema.safeParse({ endDate: "2026-12-31", reason: "x" }))).toEqual(["endDate"]);
    expect(pathsOf(schema.safeParse({ endDate: "2025-12-31", reason: "x" }))).toEqual(["endDate"]);
    expect(pathsOf(schema.safeParse({ endDate: "2026-06-30", reason: " " }))).toEqual(["reason"]);
  });

  it("không thời hạn: ngày nào từ ngày bắt đầu cũng được; gửi kèm version", () => {
    const schema = endSchema(tValidation, "2026-01-01", null);
    expect(schema.safeParse({ endDate: "2030-01-01", reason: "x" }).success).toBe(true);
    expect(toEndRequest({ endDate: "2030-01-01", reason: " x " }, 2)).toEqual({
      endDate: "2030-01-01",
      reason: "x",
      version: 2,
    });
  });
});

describe("bộ lọc trên URL", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("đọc bộ lọc hợp lệ và ghi lại theo thứ tự cố định", () => {
    const filters = filtersFromSearchParams(params(`state=ACTIVE&type=INDEFINITE&officeId=${OFFICE}&keyword=%20an%20`));
    expect(filters).toEqual({ keyword: "an", officeId: OFFICE, type: "INDEFINITE", state: "ACTIVE" });
    expect(filtersToSearchParams(filters).toString()).toBe(`keyword=an&officeId=${OFFICE}&type=INDEFINITE&state=ACTIVE`);
  });

  it("bỏ giá trị lạ", () => {
    expect(filtersFromSearchParams(params("officeId=abc&type=FOO&state=BAR"))).toEqual({
      keyword: undefined,
      officeId: undefined,
      type: undefined,
      state: undefined,
    });
  });
});

describe("getContractError", () => {
  const error = (code: string) =>
    getContractError(new ApiError({ status: 409, code, message: code }), tContractErrors, tErrors);

  it("gắn vào ô: trùng số → số hợp đồng, ngoài khoảng → ngày hiệu lực", () => {
    expect(error("CONTRACT_NUMBER_EXISTS")).toMatchObject({ field: "contractNumber", stale: false });
    expect(error("CONTRACT_SALARY_OUT_OF_RANGE")).toMatchObject({ field: "effectiveFrom" });
  });

  it("dữ liệu cũ thì tải lại; chồng lấn thì Alert, không tải lại", () => {
    expect(error("CONTRACT_VERSION_CONFLICT").stale).toBe(true);
    expect(error("CONTRACT_NOT_EDITABLE").stale).toBe(true);
    expect(error("CONTRACT_SALARY_LOCKED").stale).toBe(true);
    expect(error("CONTRACT_OVERLAP")).toEqual({ field: null, message: en.Contracts.Errors.overlap, stale: false });
  });
});
