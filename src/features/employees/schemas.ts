import type { Messages } from "next-intl";
import { z } from "zod";
import {
  EMPLOYEE_LEVELS,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  type EmployeeInput,
  type EmployeeStatusInput,
  type PersonalInfo,
  type SensitiveInput,
} from "./types";

type ValidationKey = keyof Messages["Employees"]["Validation"];
/** Hàm dịch của namespace "Employees.Validation". */
export type EmployeesValidationTranslator = (key: ValidationKey) => string;

// Khớp ràng buộc của backend (EmployeeRequest, PersonalInfoRequest, SensitiveInfoRequest, EmployeeStatusRequest).
// Ô để trống gửi null. Backend vẫn kiểm tra lại.
const PHONE = /^(0|\+84)[0-9]{9,10}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MIN_AGE = 15;

/** "2026-11-05" → "2011-11-05": ngày sinh muộn nhất để đủ `years` tuổi. */
export function yearsBefore(date: string, years: number): string {
  return `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;
}

const blank = (value: string) => value.trim() === "";
const orNull = (value: string) => (blank(value) ? null : value.trim());

/** Ô không bắt buộc: trống, hoặc khớp điều kiện. */
function optional(test: (value: string) => boolean, message: string) {
  return z.string().refine((value) => blank(value) || test(value.trim()), message);
}

function digits(pattern: RegExp, message: string) {
  return optional((value) => pattern.test(value), message);
}

// ===== Thông tin cá nhân =====

export function personalSchema(t: EmployeesValidationTranslator, today: string) {
  const latestBirthDate = yearsBefore(today, MIN_AGE);
  return z.object({
    // Cho phép gõ có khoảng trắng / dấu chấm ("0912 345 678"), bỏ đi trước khi kiểm tra và gửi.
    phone: optional((value) => PHONE.test(normalizePhone(value)), t("phoneInvalid")),
    personalEmail: optional((value) => z.email().max(254).safeParse(value).success, t("emailInvalid")),
    dateOfBirth: optional((value) => DATE.test(value) && value <= latestBirthDate, t("tooYoung")),
    gender: z.union([z.enum(GENDERS), z.literal("")]),
    address: z.string().max(255, t("tooLong")),
  });
}

export type PersonalFormValues = z.infer<ReturnType<typeof personalSchema>>;

export const EMPTY_PERSONAL: PersonalFormValues = { phone: "", personalEmail: "", dateOfBirth: "", gender: "", address: "" };

export function normalizePhone(value: string): string {
  return value.replace(/[\s.()-]/g, "");
}

export function personalToForm(personal: PersonalInfo | null | undefined): PersonalFormValues {
  if (!personal) return EMPTY_PERSONAL;
  return {
    phone: personal.phone ?? "",
    personalEmail: personal.personalEmail ?? "",
    dateOfBirth: personal.dateOfBirth ?? "",
    gender: personal.gender ?? "",
    address: personal.address ?? "",
  };
}

/** Luôn trả đủ 5 trường (backend thay cả nhóm: trường thiếu = xóa). */
export function toPersonalRequest(values: PersonalFormValues): PersonalInfo {
  const phone = orNull(values.phone);
  return {
    phone: phone === null ? null : normalizePhone(phone),
    personalEmail: orNull(values.personalEmail),
    dateOfBirth: orNull(values.dateOfBirth),
    gender: values.gender === "" ? null : values.gender,
    address: orNull(values.address),
  };
}

// ===== Hồ sơ (HR) =====

export function employeeSchema(t: EmployeesValidationTranslator, today: string) {
  const required = (value: string) => !blank(value);
  return z.object({
    fullName: z.string().trim().min(1, t("required")).max(150, t("tooLong")),
    workEmail: z.email(t("emailInvalid")).max(254, t("emailInvalid")),
    officeId: z.string().refine(required, t("required")),
    departmentId: z.string().refine(required, t("required")),
    /** "" = không thuộc team. */
    teamId: z.string(),
    positionId: z.string().refine(required, t("required")),
    level: z.union([z.enum(EMPLOYEE_LEVELS), z.literal("")]).refine(required, t("required")),
    employmentType: z.union([z.enum(EMPLOYMENT_TYPES), z.literal("")]).refine(required, t("required")),
    hireDate: z.string().refine((value) => DATE.test(value), t("required")),
    personal: personalSchema(t, today),
  });
}

export type EmployeeFormValues = z.infer<ReturnType<typeof employeeSchema>>;

/**
 * Body POST / PUT. `personal` LUÔN là object đủ 5 trường: PUT thay toàn bộ hồ sơ, gửi null sẽ xóa thông tin cá nhân
 * mà nhân viên đã tự khai.
 */
export function toEmployeeRequest(values: EmployeeFormValues, version?: number): EmployeeInput {
  return {
    fullName: values.fullName.trim(),
    workEmail: values.workEmail.trim().toLowerCase(),
    officeId: values.officeId,
    departmentId: values.departmentId,
    teamId: values.teamId === "" ? null : values.teamId,
    positionId: values.positionId,
    level: values.level as EmployeeInput["level"],
    employmentType: values.employmentType as EmployeeInput["employmentType"],
    hireDate: values.hireDate,
    personal: toPersonalRequest(values.personal),
    ...(version === undefined ? {} : { version }),
  };
}

// ===== Trạng thái =====

export function statusSchema(t: EmployeesValidationTranslator, hireDate: string) {
  return z
    .object({
      // Boolean(...) thay cho `value !== ""`: TS suy ra type predicate làm kiểu output khác kiểu input của form.
      status: z.union([z.enum(EMPLOYEE_STATUSES), z.literal("")]).refine((value) => Boolean(value), t("required")),
      terminationDate: z.string(),
      reason: z.string().max(500, t("tooLong")),
    })
    .superRefine((values, ctx) => {
      if (values.status !== "TERMINATED") return;
      if (!DATE.test(values.terminationDate)) {
        ctx.addIssue({ code: "custom", path: ["terminationDate"], message: t("required") });
      } else if (values.terminationDate < hireDate) {
        ctx.addIssue({ code: "custom", path: ["terminationDate"], message: t("terminationBeforeHire") });
      }
    });
}

export type StatusFormValues = z.infer<ReturnType<typeof statusSchema>>;

export function toStatusRequest(values: StatusFormValues, version: number): EmployeeStatusInput {
  return {
    status: values.status as EmployeeStatusInput["status"],
    terminationDate: values.status === "TERMINATED" ? values.terminationDate : null,
    reason: orNull(values.reason),
    version,
  };
}

// ===== Thông tin nhạy cảm =====

export function sensitiveSchema(t: EmployeesValidationTranslator, today: string) {
  return z.object({
    nationalId: digits(/^[0-9]{12}$/, t("nationalIdInvalid")),
    nationalIdIssuedOn: optional((value) => DATE.test(value) && value < today, t("pastDate")),
    nationalIdIssuedPlace: z.string().max(150, t("tooLong")),
    taxCode: digits(/^([0-9]{10}|[0-9]{13})$/, t("taxCodeInvalid")),
    socialInsuranceNo: digits(/^[0-9]{10}$/, t("socialInsuranceInvalid")),
    bankName: z.string().max(100, t("tooLong")),
    bankAccountNo: digits(/^[0-9]{6,30}$/, t("bankAccountInvalid")),
    bankAccountHolder: z.string().max(150, t("tooLong")),
    taxDependents: z
      .string()
      .refine((value) => /^\d{1,2}$/.test(value.trim()) && Number(value) <= 20, t("dependentsInvalid")),
  });
}

export type SensitiveFormValues = z.infer<ReturnType<typeof sensitiveSchema>>;

export function sensitiveToForm(info: Partial<SensitiveInput> | null | undefined): SensitiveFormValues {
  return {
    nationalId: info?.nationalId ?? "",
    nationalIdIssuedOn: info?.nationalIdIssuedOn ?? "",
    nationalIdIssuedPlace: info?.nationalIdIssuedPlace ?? "",
    taxCode: info?.taxCode ?? "",
    socialInsuranceNo: info?.socialInsuranceNo ?? "",
    bankName: info?.bankName ?? "",
    bankAccountNo: info?.bankAccountNo ?? "",
    bankAccountHolder: info?.bankAccountHolder ?? "",
    taxDependents: String(info?.taxDependents ?? 0),
  };
}

/** Thay cả nhóm. `version` null khi hồ sơ chưa có thông tin nhạy cảm. */
export function toSensitiveRequest(values: SensitiveFormValues, version: number | null): SensitiveInput {
  return {
    nationalId: orNull(values.nationalId),
    nationalIdIssuedOn: orNull(values.nationalIdIssuedOn),
    nationalIdIssuedPlace: orNull(values.nationalIdIssuedPlace),
    taxCode: orNull(values.taxCode),
    socialInsuranceNo: orNull(values.socialInsuranceNo),
    bankName: orNull(values.bankName),
    bankAccountNo: orNull(values.bankAccountNo),
    bankAccountHolder: orNull(values.bankAccountHolder),
    taxDependents: Number(values.taxDependents.trim()),
    version,
  };
}
