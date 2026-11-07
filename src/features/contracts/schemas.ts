import type { Messages } from "next-intl";
import { z } from "zod";
import { moneyToInput, parseMoney } from "./money";
import {
  CONTRACT_TYPES,
  type CreateContractInput,
  type EndContractInput,
  type Salary,
  type SalaryAmounts,
  type SalaryInput,
  type UpdateContractInput,
} from "./types";

type ValidationKey = keyof Messages["Contracts"]["Validation"];
/** Hàm dịch của namespace "Contracts.Validation". */
export type ContractsValidationTranslator = (key: ValidationKey) => string;

// Khớp ContractDtos của backend. Ô để trống gửi null. Backend vẫn kiểm tra lại.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ===== Số tiền =====

function amountsSchema(t: ContractsValidationTranslator) {
  return z.object({
    baseSalary: z.string().refine((value) => (parseMoney(value) ?? 0) > 0, t("salaryRequired")),
    lunchAllowance: z.string(),
    otherAllowance: z.string(),
    insuranceSalary: z.string(),
  });
}

export type AmountsFormValues = z.infer<ReturnType<typeof amountsSchema>>;

export const EMPTY_AMOUNTS: AmountsFormValues = { baseSalary: "", lunchAllowance: "", otherAllowance: "", insuranceSalary: "" };

export function amountsToForm(salary: Salary | undefined): AmountsFormValues {
  if (!salary) return EMPTY_AMOUNTS;
  return {
    baseSalary: moneyToInput(salary.baseSalary),
    lunchAllowance: moneyToInput(salary.lunchAllowance),
    otherAllowance: moneyToInput(salary.otherAllowance),
    insuranceSalary: moneyToInput(salary.insuranceSalary),
  };
}

export function toAmounts(values: AmountsFormValues): SalaryAmounts {
  return {
    baseSalary: parseMoney(values.baseSalary) ?? 0,
    lunchAllowance: parseMoney(values.lunchAllowance),
    otherAllowance: parseMoney(values.otherAllowance),
    insuranceSalary: parseMoney(values.insuranceSalary),
  };
}

// ===== Hợp đồng =====

/** `hireDate` có khi tạo từ hồ sơ; thiếu thì để backend kiểm tra (CONTRACT_INVALID_DATES). */
export function contractSchema(t: ContractsValidationTranslator, hireDate?: string) {
  return z
    .object({
      contractNumber: z.string().trim().min(1, t("required")).max(50, t("tooLong")),
      type: z.union([z.enum(CONTRACT_TYPES), z.literal("")]).refine((value) => Boolean(value), t("required")),
      startDate: z.string().refine((value) => DATE.test(value), t("required")),
      endDate: z.string(),
      salary: amountsSchema(t),
    })
    .superRefine((values, ctx) => {
      if (hireDate && DATE.test(values.startDate) && values.startDate < hireDate) {
        ctx.addIssue({ code: "custom", path: ["startDate"], message: t("beforeHireDate") });
      }
      if (values.type === "INDEFINITE") return;
      if (!DATE.test(values.endDate)) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: t("required") });
      } else if (values.endDate < values.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: t("endBeforeStart") });
      }
    });
}

export type ContractFormValues = z.infer<ReturnType<typeof contractSchema>>;

function contractFields(values: ContractFormValues) {
  return {
    contractNumber: values.contractNumber.trim(),
    type: values.type as CreateContractInput["type"],
    startDate: values.startDate,
    // Không thời hạn thì không gửi ngày kết thúc, kể cả khi ô còn giá trị cũ trước lúc đổi loại.
    endDate: values.type === "INDEFINITE" ? null : values.endDate,
    salary: toAmounts(values.salary),
  };
}

export function toCreateRequest(values: ContractFormValues, employeeId: string): CreateContractInput {
  return { employeeId, ...contractFields(values) };
}

export function toUpdateRequest(values: ContractFormValues, version: number): UpdateContractInput {
  return { ...contractFields(values), version };
}

// ===== Mức lương =====

/** Bắt buộc lý do khi mức có hiệu lực từ hôm nay trở về trước (tăng hồi tố hoặc sửa nhầm). */
export function salarySchema(
  t: ContractsValidationTranslator,
  range: { min: string; max: string | null },
  today: string,
) {
  return z
    .object({
      effectiveFrom: z.string().refine((value) => DATE.test(value), t("required")),
      amounts: amountsSchema(t),
      reason: z.string().max(500, t("tooLong")),
    })
    .superRefine((values, ctx) => {
      if (!DATE.test(values.effectiveFrom)) return;
      if (values.effectiveFrom < range.min || (range.max !== null && values.effectiveFrom > range.max)) {
        ctx.addIssue({ code: "custom", path: ["effectiveFrom"], message: t("outOfContract") });
      }
      if (values.effectiveFrom <= today && values.reason.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["reason"], message: t("reasonRequired") });
      }
    });
}

export type SalaryFormValues = z.infer<ReturnType<typeof salarySchema>>;

export function toSalaryRequest(values: SalaryFormValues): SalaryInput {
  const reason = values.reason.trim();
  return { effectiveFrom: values.effectiveFrom, amounts: toAmounts(values.amounts), reason: reason === "" ? null : reason };
}

// ===== Kết thúc sớm =====

/** Ngày mới trong [startDate, ngày cuối hiện tại); không thời hạn thì chỉ cần từ startDate. */
export function endSchema(t: ContractsValidationTranslator, startDate: string, currentEndDate: string | null) {
  return z.object({
    endDate: z.string().refine(
      (value) => DATE.test(value) && value >= startDate && (currentEndDate === null || value < currentEndDate),
      t("endDateInvalid"),
    ),
    reason: z.string().trim().min(1, t("required")).max(500, t("tooLong")),
  });
}

export type EndFormValues = z.infer<ReturnType<typeof endSchema>>;

export function toEndRequest(values: EndFormValues, version: number): EndContractInput {
  return { endDate: values.endDate, reason: values.reason.trim(), version };
}
