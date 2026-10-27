import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import type { CurrentUser } from "@/lib/auth/types";
import { getUserError } from "./error-messages";
import { groupPermissions, permissionMessageKey } from "./permission-groups";
import { getRoleRules, sortRoles } from "./role-rules";
import { createRoleSchema } from "./schemas";
import type { PermissionInfo, RoleSummary } from "./types";

const ADMIN: CurrentUser = {
  id: "admin",
  email: "admin@test.com",
  displayName: "Admin",
  status: "ACTIVE",
  roles: ["ADMIN"],
  permissions: ["role:read", "role:assign", "role:manage"],
};
const HR: CurrentUser = { ...ADMIN, id: "hr", roles: ["HR"], permissions: ["role:read"] };

const role = (code: string, system: boolean, userCount: number): RoleSummary => ({
  code,
  name: code,
  description: null,
  system,
  permissionCodes: [],
  userCount,
});

describe("getRoleRules", () => {
  it("ADMIN bị khóa: không sửa, không xóa", () => {
    expect(getRoleRules(role("ADMIN", true, 2), ADMIN)).toEqual({
      locked: true,
      canEdit: false,
      canDelete: false,
      deleteBlocked: "system",
    });
  });

  it("role hệ thống: sửa được, không xóa được", () => {
    expect(getRoleRules(role("HR", true, 3), ADMIN)).toMatchObject({ canEdit: true, canDelete: false, deleteBlocked: "system" });
  });

  it("role tự tạo: chưa ai giữ thì xóa được, còn người giữ thì báo inUse", () => {
    expect(getRoleRules(role("ACCOUNTANT", false, 0), ADMIN)).toMatchObject({ canDelete: true, deleteBlocked: null });
    expect(getRoleRules(role("ACCOUNTANT", false, 2), ADMIN)).toMatchObject({ canDelete: false, deleteBlocked: "inUse" });
  });

  it("chỉ có role:read: chỉ xem, không cần giải thích vì sao không xóa", () => {
    expect(getRoleRules(role("ACCOUNTANT", false, 0), HR)).toEqual({
      locked: false,
      canEdit: false,
      canDelete: false,
      deleteBlocked: null,
    });
  });
});

describe("sortRoles", () => {
  it("role hệ thống theo thứ tự cố định, role tự tạo theo tên", () => {
    const sorted = sortRoles([role("ZETA", false, 0), role("EMPLOYEE", true, 0), role("ADMIN", true, 0), role("ALPHA", false, 0)]);
    expect(sorted.map((r) => r.code)).toEqual(["ADMIN", "EMPLOYEE", "ALPHA", "ZETA"]);
  });
});

describe("groupPermissions", () => {
  const permission = (code: string): PermissionInfo => ({ code, name: code, description: null });

  it("gom theo phần trước dấu ':', nhóm đã biết theo thứ tự cố định, nhóm mới xếp cuối", () => {
    const groups = groupPermissions(
      ["leave:approve", "audit:read", "user:read", "role:read", "user:lock", "session:read-all"].map(permission),
    );
    expect(groups.map((g) => g.key)).toEqual(["user", "role", "session", "audit", "leave"]);
    expect(groups[0].permissions.map((p) => p.code)).toEqual(["user:read", "user:lock"]);
  });

  it("key dịch thay ':' và '-' bằng '_'", () => {
    expect(permissionMessageKey("session:read-all")).toBe("session_read_all");
    expect(permissionMessageKey("user:read")).toBe("user_read");
  });

  it("mọi quyền hiện có đều có bản dịch", () => {
    const codes = ["user:read", "user:create", "user:update", "user:lock", "role:read", "role:assign", "role:manage", "session:read-all", "audit:read"];
    for (const code of codes) expect(en.Permissions).toHaveProperty(permissionMessageKey(code));
  });
});

describe("createRoleSchema", () => {
  const schema = createRoleSchema(createTranslator({ locale: "en", messages: en, namespace: "RoleAdmin.Validation" }));
  const valid = { code: "ACCOUNTANT", name: "Accountant", description: "" };

  it("mã hợp lệ theo regex của backend", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, code: "KE_TOAN_2" }).success).toBe(true);
    // Chữ thường được tự đổi sang HOA.
    const lower = schema.safeParse({ ...valid, code: "accountant" });
    expect(lower.success && lower.data.code).toBe("ACCOUNTANT");
  });

  it("mã sai: quá ngắn, bắt đầu bằng số, có gạch ngang, có khoảng trắng", () => {
    for (const code of ["AB", "1ABC", "A-B-C", "ke toan"]) {
      expect(schema.safeParse({ ...valid, code }).success).toBe(false);
    }
  });
});

describe("getUserError với lỗi của role", () => {
  const tUserErrors = createTranslator({ locale: "en", messages: en, namespace: "Users.Errors" });
  const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });
  const apiError = (status: number, code: string) => new ApiError({ status, code, message: code });

  it("trùng mã gắn vào ô mã; còn người giữ / role hệ thống hiện Alert", () => {
    expect(getUserError(apiError(409, "ROLE_CODE_EXISTS"), tUserErrors, tErrors)).toEqual({
      field: "code",
      message: "A role with this code already exists.",
    });
    expect(getUserError(apiError(409, "ROLE_IN_USE"), tUserErrors, tErrors).field).toBeNull();
    expect(getUserError(apiError(409, "SYSTEM_ROLE_PROTECTED"), tUserErrors, tErrors).message).toContain("System roles");
  });
});
