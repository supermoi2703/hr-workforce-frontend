import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { getTransferError } from "./error-messages";
import {
  canCancelTransfer,
  canProposeTransfer,
  changedUnits,
  hasUnitChange,
  isOpenTransfer,
  teamsOf,
  unitChoices,
  unitName,
} from "./rules";
import { cancelSchema, toCancelRequest, toTransferRequest, transferSchema, type TransferFormValues } from "./schemas";
import { TRANSFER_STATUSES, type TeamOption, type Transfer, type UnitOption, type UnitSet } from "./types";

const tValidation = createTranslator({ locale: "en", messages: en, namespace: "Transfers.Validation" });
const tTransferErrors = createTranslator({ locale: "en", messages: en, namespace: "Transfers.Errors" });
const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

const TODAY = "2026-11-12";
const OFFICE = "off-1";
const DEPARTMENT = "dep-1";
const TEAM = "team-1";
const POSITION = "pos-1";

const units = (patch: Partial<UnitSet> = {}): UnitSet => ({
  officeId: OFFICE,
  departmentId: DEPARTMENT,
  teamId: TEAM,
  positionId: POSITION,
  ...patch,
});

const transfer = (patch: Partial<Transfer> = {}): Transfer => ({
  id: "t1",
  employeeId: "e1",
  employeeCode: "NV00001",
  employeeName: "Nguyễn Văn An",
  from: units(),
  to: units({ teamId: "team-2" }),
  effectiveDate: "2026-12-01",
  reason: "Mở rộng đội dự án",
  status: "PENDING",
  appliedOn: null,
  cancelReason: null,
  approvalRequestId: "a1",
  createdAt: "2026-11-12T01:00:00Z",
  ...patch,
});

const can =
  (...permissions: string[]) =>
  (permission: string) =>
    permissions.includes(permission);

const messagesOf = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];
const pathsOf = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("đề xuất còn chạy", () => {
  it("chỉ chờ duyệt và đã duyệt chờ hiệu lực", () => {
    expect(TRANSFER_STATUSES.filter((status) => isOpenTransfer({ status }))).toEqual(["PENDING", "APPROVED"]);
  });
});

describe("canProposeTransfer", () => {
  const employee = { id: "e1", status: "ACTIVE" };
  const propose = can("employee:transfer");

  it("có quyền, đang làm việc, chưa có đề xuất đang chạy", () => {
    expect(canProposeTransfer(employee, "me", propose, [])).toBe(true);
    expect(canProposeTransfer({ ...employee, status: "ON_LEAVE" }, "me", propose, undefined)).toBe(true);
    // Đề xuất cũ đã xong thì đề xuất mới được
    expect(canProposeTransfer(employee, "me", propose, [transfer({ status: "APPLIED" })])).toBe(true);
  });

  it("không hiện khi thiếu quyền, hồ sơ của chính mình, chưa nhận việc, đã nghỉ việc hoặc đang có đề xuất", () => {
    expect(canProposeTransfer(employee, "me", can("employee:read"), [])).toBe(false);
    expect(canProposeTransfer(employee, "e1", propose, [])).toBe(false);
    expect(canProposeTransfer({ ...employee, status: "ONBOARDING" }, "me", propose, [])).toBe(false);
    expect(canProposeTransfer({ ...employee, status: "TERMINATED" }, "me", propose, [])).toBe(false);
    expect(canProposeTransfer(employee, "me", propose, [transfer({ status: "PENDING" })])).toBe(false);
    expect(canProposeTransfer(employee, "me", propose, [transfer({ status: "APPROVED" })])).toBe(false);
  });
});

describe("canCancelTransfer", () => {
  it("chỉ đề xuất đã duyệt chưa tới ngày, và cần employee:manage", () => {
    expect(canCancelTransfer({ status: "APPROVED" }, can("employee:manage"))).toBe(true);
    expect(canCancelTransfer({ status: "APPROVED" }, can("employee:transfer"))).toBe(false);
    // Đang chờ duyệt thì rút ở /approvals, không hủy ở đây
    expect(canCancelTransfer({ status: "PENDING" }, can("employee:manage"))).toBe(false);
    expect(canCancelTransfer({ status: "APPLIED" }, can("employee:manage"))).toBe(false);
  });
});

describe("changedUnits / hasUnitChange", () => {
  it("liệt kê đúng thứ đổi, theo thứ tự trên màn hình", () => {
    expect(changedUnits(units(), units())).toEqual([]);
    expect(changedUnits(units(), units({ positionId: "pos-2", officeId: "off-2", teamId: null }))).toEqual([
      "office",
      "team",
      "position",
    ]);
  });

  it("form giữ teamId rỗng cho 'không thuộc team': không đổi gì thì chưa gửi được", () => {
    const current = units({ teamId: null });
    expect(hasUnitChange(current, { officeId: OFFICE, departmentId: DEPARTMENT, teamId: "", positionId: POSITION })).toBe(
      false,
    );
    expect(hasUnitChange(current, { officeId: OFFICE, departmentId: DEPARTMENT, teamId: TEAM, positionId: POSITION })).toBe(
      true,
    );
    expect(hasUnitChange(units(), { officeId: OFFICE, departmentId: DEPARTMENT, teamId: "", positionId: POSITION })).toBe(
      true,
    );
  });
});

describe("danh mục đơn vị", () => {
  const offices: UnitOption[] = [
    { id: "a", name: "Hà Nội", active: true },
    { id: "b", name: "Đà Nẵng", active: false },
  ];
  const teams: TeamOption[] = [
    { id: "t1", name: "Backend", active: true, departmentId: "d1" },
    { id: "t2", name: "Sales", active: true, departmentId: "d2" },
  ];

  it("đơn vị đang dùng, cộng đơn vị hiện tại dù đã ngừng dùng", () => {
    expect(unitChoices(offices).map((unit) => unit.id)).toEqual(["a"]);
    expect(unitChoices(offices, "b").map((unit) => unit.id)).toEqual(["a", "b"]);
    expect(unitChoices(undefined)).toEqual([]);
  });

  it("team của một phòng; chưa chọn phòng thì rỗng", () => {
    expect(teamsOf(teams, "d1").map((team) => team.id)).toEqual(["t1"]);
    expect(teamsOf(teams, "")).toEqual([]);
  });

  it("tên đơn vị, kể cả đã ngừng dùng; không tra được thì '—'", () => {
    expect(unitName(offices, "b")).toBe("Đà Nẵng");
    expect(unitName(offices, "x")).toBe("—");
    expect(unitName(undefined, "a")).toBe("—");
    expect(unitName(offices, null)).toBe("—");
  });
});

describe("transferSchema", () => {
  const schema = transferSchema(tValidation, TODAY);
  const valid: TransferFormValues = {
    officeId: OFFICE,
    departmentId: DEPARTMENT,
    teamId: "",
    positionId: POSITION,
    effectiveDate: TODAY,
    reason: "  Mở rộng đội dự án  ",
  };

  it("hợp lệ: ngày hiệu lực là hôm nay hoặc sau đó, team có thể trống", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, effectiveDate: "2026-12-01" }).success).toBe(true);
  });

  it("ngày đã qua, lý do trống, thiếu đơn vị", () => {
    const past = schema.safeParse({ ...valid, effectiveDate: "2026-11-11" });
    expect(pathsOf(past)).toEqual(["effectiveDate"]);
    expect(messagesOf(past)).toEqual([en.Transfers.Validation.pastDate]);

    const empty = schema.safeParse({ ...valid, reason: "   ", officeId: "" });
    expect(pathsOf(empty).sort()).toEqual(["officeId", "reason"]);
  });

  it("lý do tối đa 500 ký tự", () => {
    expect(schema.safeParse({ ...valid, reason: "a".repeat(501) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, reason: "a".repeat(500) }).success).toBe(true);
  });

  it("body gửi lên: team trống thành null, lý do cắt khoảng trắng", () => {
    expect(toTransferRequest("e1", valid)).toEqual({
      employeeId: "e1",
      officeId: OFFICE,
      departmentId: DEPARTMENT,
      teamId: null,
      positionId: POSITION,
      effectiveDate: TODAY,
      reason: "Mở rộng đội dự án",
    });
    expect(toTransferRequest("e1", { ...valid, teamId: TEAM }).teamId).toBe(TEAM);
  });
});

describe("cancelSchema", () => {
  it("bắt buộc lý do", () => {
    const schema = cancelSchema(tValidation);
    expect(schema.safeParse({ reason: " " }).success).toBe(false);
    expect(toCancelRequest({ reason: " Đổi kế hoạch " })).toEqual({ reason: "Đổi kế hoạch" });
  });
});

describe("getTransferError", () => {
  const error = (code: string, status = 409) =>
    getTransferError(new ApiError({ status, code, message: code }), tTransferErrors, tErrors);

  it("ngày hiệu lực sai gắn vào ô ngày", () => {
    expect(error("TRANSFER_INVALID_DATE", 400)).toMatchObject({ field: "effectiveDate", stale: false });
  });

  it("dữ liệu cũ thì tải lại; không đổi gì thì Alert, không tải lại", () => {
    expect(error("TRANSFER_ALREADY_OPEN").stale).toBe(true);
    expect(error("TRANSFER_NOT_CANCELLABLE").stale).toBe(true);
    expect(error("TRANSFER_NO_CHANGE", 400)).toEqual({ field: null, message: en.Transfers.Errors.noChange, stale: false });
  });
});

describe("bản dịch", () => {
  it("vi và en có cùng bộ khóa của namespace Transfers", () => {
    const keys = (value: unknown, prefix = ""): string[] =>
      value !== null && typeof value === "object"
        ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}${key}.`))
        : [prefix];
    expect(keys(vi.Transfers).sort()).toEqual(keys(en.Transfers).sort());
  });

  it("mọi trạng thái đều có nhãn", () => {
    for (const status of TRANSFER_STATUSES) {
      expect(en.Transfers.statuses).toHaveProperty(status);
      expect(vi.Transfers.statuses).toHaveProperty(status);
    }
  });
});
