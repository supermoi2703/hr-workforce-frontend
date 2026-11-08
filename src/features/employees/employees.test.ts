import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import { getEmployeeError } from "./error-messages";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import {
  allowedStatusTransitions,
  buildOrgLookup,
  getEmployeeActions,
  maskSensitive,
  needsAccountUnlock,
  orgUnitOptions,
  teamsOf,
} from "./rules";
import {
  EMPTY_PERSONAL,
  employeeSchema,
  personalSchema,
  personalToForm,
  sensitiveSchema,
  sensitiveToForm,
  statusSchema,
  toEmployeeRequest,
  toPersonalRequest,
  toSensitiveRequest,
  toStatusRequest,
  yearsBefore,
  type EmployeeFormValues,
} from "./schemas";
import type { EmployeeAccount, EmployeeStatus } from "./types";

const tValidation = createTranslator({ locale: "en", messages: en, namespace: "Employees.Validation" });
const tEmployeeErrors = createTranslator({ locale: "en", messages: en, namespace: "Employees.Errors" });
const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

const TODAY = "2026-11-05";
const OFFICE = "00000000-0000-0000-0000-00000000d001";
const DEPARTMENT = "00000000-0000-0000-0000-00000000d002";
const TEAM = "00000000-0000-0000-0000-00000000d004";
const POSITION = "00000000-0000-0000-0000-00000000d003";

const messagesOf = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("allowedStatusTransitions", () => {
  it.each<[EmployeeStatus, EmployeeStatus[]]>([
    ["ONBOARDING", ["ACTIVE", "TERMINATED"]],
    ["ACTIVE", ["ON_LEAVE", "TERMINATED"]],
    ["ON_LEAVE", ["ACTIVE", "TERMINATED"]],
    ["TERMINATED", ["ACTIVE"]],
  ])("%s → %j (khớp bảng chuyển của backend)", (from, to) => {
    expect(allowedStatusTransitions(from)).toEqual(to);
  });
});

describe("needsAccountUnlock", () => {
  const account = (status: EmployeeAccount["status"]) => ({ userId: "u1", status });
  it("vào làm lại mà tài khoản còn khóa / vô hiệu hóa thì nhắc mở khóa", () => {
    expect(needsAccountUnlock({ status: "ACTIVE", account: account("LOCKED") })).toBe(true);
    expect(needsAccountUnlock({ status: "ONBOARDING", account: account("DISABLED") })).toBe(true);
  });
  it("đã nghỉ việc, tài khoản đang dùng, hoặc chưa có tài khoản thì không", () => {
    expect(needsAccountUnlock({ status: "TERMINATED", account: account("LOCKED") })).toBe(false);
    expect(needsAccountUnlock({ status: "ACTIVE", account: account("ACTIVE") })).toBe(false);
    expect(needsAccountUnlock({ status: "ACTIVE", account: null })).toBe(false);
  });
});

describe("getEmployeeActions", () => {
  const can = (...permissions: string[]) => (permission: string) => permissions.includes(permission);
  const noAccount = { status: "ACTIVE" as const, account: null };

  it("HR văn phòng: sửa, đổi trạng thái, cấp tài khoản, xem nhạy cảm", () => {
    expect(
      getEmployeeActions(noAccount, can("employee:manage", "employee:sensitive", "user:create", "user:read")),
    ).toEqual({
      edit: true,
      changeStatus: true,
      provisionAccount: true,
      viewSensitive: true,
      viewAccount: false,
      viewAuditLog: false,
      viewHistory: true,
    });
  });

  it("Manager chỉ xem: không có thao tác nào", () => {
    expect(Object.values(getEmployeeActions(noAccount, can("employee:read"))).some(Boolean)).toBe(false);
  });

  it("không cấp tài khoản khi đã có tài khoản hoặc đã nghỉ việc", () => {
    const perms = can("user:create", "user:read");
    expect(getEmployeeActions({ status: "ACTIVE", account: { userId: "u", status: "PENDING" } }, perms)).toMatchObject({
      provisionAccount: false,
      viewAccount: true,
    });
    expect(getEmployeeActions({ status: "TERMINATED", account: null }, perms).provisionAccount).toBe(false);
  });
});

describe("maskSensitive", () => {
  it("chỉ hiện 4 số cuối; chuỗi ngắn che hết; trống → null", () => {
    expect(maskSensitive("079203001234")).toBe("•••• 1234");
    expect(maskSensitive("12345")).toBe("••••");
    expect(maskSensitive("")).toBeNull();
    expect(maskSensitive(null)).toBeNull();
  });
});

describe("danh mục tổ chức", () => {
  const units = {
    offices: [{ id: OFFICE, code: "HN", name: "Hà Nội", active: true }],
    departments: [
      { id: DEPARTMENT, code: "PTPM", name: "Phát triển phần mềm", active: true },
      { id: "old", code: "OLD", name: "Phòng cũ", active: false },
    ],
    teams: [
      { id: TEAM, code: "BE", name: "Backend", departmentId: DEPARTMENT, active: true },
      { id: "t2", code: "QA", name: "QA", departmentId: "old", active: true },
    ],
    positions: [],
  };

  it("buildOrgLookup tra cả đơn vị đã ngừng dùng; id lạ / null → undefined", () => {
    const lookup = buildOrgLookup(units);
    expect(lookup.department("old")?.name).toBe("Phòng cũ");
    expect(lookup.team(TEAM)?.departmentId).toBe(DEPARTMENT);
    expect(lookup.position(POSITION)).toBeUndefined();
    expect(lookup.office(null)).toBeUndefined();
    expect(buildOrgLookup({}).office(OFFICE)).toBeUndefined();
  });

  it("orgUnitOptions: đơn vị đang dùng + đơn vị hồ sơ đang trỏ tới dù đã ngừng", () => {
    expect(orgUnitOptions(units.departments).map((unit) => unit.id)).toEqual([DEPARTMENT]);
    expect(orgUnitOptions(units.departments, "old").map((unit) => unit.id)).toEqual([DEPARTMENT, "old"]);
  });

  it("teamsOf: chỉ team của phòng đã chọn; chưa chọn phòng → rỗng", () => {
    expect(teamsOf(units.teams, DEPARTMENT).map((team) => team.id)).toEqual([TEAM]);
    expect(teamsOf(units.teams, "")).toEqual([]);
  });
});

describe("bộ lọc trên URL", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("đọc bộ lọc hợp lệ và ghi lại theo thứ tự cố định", () => {
    const filters = filtersFromSearchParams(
      params(`status=ACTIVE&teamId=${TEAM}&departmentId=${DEPARTMENT}&keyword=%20an%20`),
    );
    expect(filters).toEqual({ keyword: "an", officeId: undefined, departmentId: DEPARTMENT, teamId: TEAM, status: "ACTIVE" });
    expect(filtersToSearchParams(filters).toString()).toBe(
      `keyword=an&departmentId=${DEPARTMENT}&teamId=${TEAM}&status=ACTIVE`,
    );
  });

  it("bỏ id không phải UUID, trạng thái lạ, team khi chưa chọn phòng", () => {
    expect(filtersFromSearchParams(params(`officeId=abc&status=FIRED&teamId=${TEAM}`))).toEqual({
      keyword: undefined,
      officeId: undefined,
      departmentId: undefined,
      teamId: undefined,
      status: undefined,
    });
  });
});

describe("personalSchema / toPersonalRequest", () => {
  const schema = personalSchema(tValidation, TODAY);
  const parse = (patch: Partial<typeof EMPTY_PERSONAL>) => schema.safeParse({ ...EMPTY_PERSONAL, ...patch });

  it("mọi ô để trống đều hợp lệ", () => {
    expect(parse({}).success).toBe(true);
  });

  it("điện thoại Việt Nam, cho phép gõ có khoảng trắng; gửi lên đã bỏ khoảng trắng", () => {
    expect(parse({ phone: "0912 345 678" }).success).toBe(true);
    expect(parse({ phone: "+84912345678" }).success).toBe(true);
    expect(messagesOf(parse({ phone: "12345" }))).toEqual([en.Employees.Validation.phoneInvalid]);
    expect(toPersonalRequest({ ...EMPTY_PERSONAL, phone: " 0912.345.678 " }).phone).toBe("0912345678");
  });

  it("ngày sinh phải đủ 15 tuổi (tính tới hôm nay)", () => {
    expect(yearsBefore(TODAY, 15)).toBe("2011-11-05");
    expect(parse({ dateOfBirth: "2011-11-05" }).success).toBe(true);
    expect(messagesOf(parse({ dateOfBirth: "2011-11-06" }))).toEqual([en.Employees.Validation.tooYoung]);
  });

  it("luôn trả đủ 5 trường, ô trống → null", () => {
    expect(toPersonalRequest(EMPTY_PERSONAL)).toEqual({
      phone: null,
      personalEmail: null,
      dateOfBirth: null,
      gender: null,
      address: null,
    });
    expect(personalToForm(null)).toEqual(EMPTY_PERSONAL);
  });
});

describe("employeeSchema / toEmployeeRequest", () => {
  const schema = employeeSchema(tValidation, TODAY);
  const valid: EmployeeFormValues = {
    fullName: " Nguyễn Văn A ",
    workEmail: "Nguyen.Van.A@Demo.Local",
    officeId: OFFICE,
    departmentId: DEPARTMENT,
    teamId: "",
    positionId: POSITION,
    level: "JUNIOR",
    employmentType: "PROBATION",
    hireDate: "2026-11-10",
    personal: { ...EMPTY_PERSONAL, phone: "0912345678" },
  };

  it("thiếu đơn vị / level / loại nhân viên → Bắt buộc", () => {
    const result = schema.safeParse({ ...valid, officeId: "", level: "", employmentType: "" });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(["officeId", "level", "employmentType"]);
  });

  it("PUT luôn gửi lại thông tin cá nhân (không bao giờ null), team trống → null, email chữ thường", () => {
    const body = toEmployeeRequest(valid, 3);
    expect(body).toMatchObject({
      fullName: "Nguyễn Văn A",
      workEmail: "nguyen.van.a@demo.local",
      teamId: null,
      version: 3,
      personal: { phone: "0912345678", address: null },
    });
    expect(toEmployeeRequest({ ...valid, personal: EMPTY_PERSONAL }).personal).not.toBeNull();
    expect("version" in toEmployeeRequest(valid)).toBe(false);
  });
});

describe("statusSchema / toStatusRequest", () => {
  const schema = statusSchema(tValidation, "2026-01-15");

  it("nghỉ việc bắt buộc ngày nghỉ, không trước ngày vào làm", () => {
    expect(messagesOf(schema.safeParse({ status: "TERMINATED", terminationDate: "", reason: "" }))).toEqual([
      en.Employees.Validation.required,
    ]);
    expect(messagesOf(schema.safeParse({ status: "TERMINATED", terminationDate: "2026-01-14", reason: "" }))).toEqual([
      en.Employees.Validation.terminationBeforeHire,
    ]);
    expect(schema.safeParse({ status: "TERMINATED", terminationDate: "2026-01-15", reason: "" }).success).toBe(true);
  });

  it("trạng thái khác không cần ngày nghỉ và không gửi ngày nghỉ", () => {
    expect(schema.safeParse({ status: "ON_LEAVE", terminationDate: "", reason: "" }).success).toBe(true);
    expect(toStatusRequest({ status: "ACTIVE", terminationDate: "2026-12-01", reason: " " }, 7)).toEqual({
      status: "ACTIVE",
      terminationDate: null,
      reason: null,
      version: 7,
    });
  });
});

describe("sensitiveSchema / toSensitiveRequest", () => {
  const schema = sensitiveSchema(tValidation, TODAY);
  const empty = sensitiveToForm(null);

  it("khớp định dạng của backend", () => {
    expect(schema.safeParse(empty).success).toBe(true);
    const result = schema.safeParse({
      ...empty,
      nationalId: "12345",
      taxCode: "123456789012",
      socialInsuranceNo: "123",
      bankAccountNo: "12a456",
      taxDependents: "21",
      nationalIdIssuedOn: TODAY,
    });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "nationalId",
      "nationalIdIssuedOn",
      "taxCode",
      "socialInsuranceNo",
      "bankAccountNo",
      "taxDependents",
    ]);
  });

  it("ô trống → null, số người phụ thuộc là số, giữ version (null khi chưa khai)", () => {
    expect(toSensitiveRequest({ ...empty, taxCode: "0123456789", taxDependents: "2" }, null)).toMatchObject({
      nationalId: null,
      taxCode: "0123456789",
      taxDependents: 2,
      version: null,
    });
  });
});

describe("getEmployeeError", () => {
  const error = (code: string) => getEmployeeError(new ApiError({ status: 409, code, message: code }), tEmployeeErrors, tErrors);

  it("gắn vào ô: email trùng → workEmail, ngoài văn phòng → officeId", () => {
    expect(error("EMAIL_ALREADY_EXISTS")).toMatchObject({ field: "workEmail", stale: false });
    expect(error("EMPLOYEE_OUTSIDE_OFFICE")).toMatchObject({ field: "officeId" });
  });

  it("dữ liệu cũ (version lệch, chuyển trạng thái sai) → stale để tải lại", () => {
    expect(error("EMPLOYEE_VERSION_CONFLICT")).toEqual({
      field: null,
      message: en.Employees.Errors.versionConflict,
      stale: true,
    });
    expect(error("INVALID_EMPLOYEE_STATUS_TRANSITION").stale).toBe(true);
  });

  it("mã lạ → để getErrorMessage xử lý (message của backend là phương án cuối)", () => {
    expect(error("SOMETHING_ELSE")).toEqual({ field: null, stale: false, message: "SOMETHING_ELSE" });
  });
});
