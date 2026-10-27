import { describe, expect, it } from "vitest";
import type { CurrentUser, UserStatus } from "@/lib/auth/types";
import type { UserSummary } from "./types";
import { getUserActions, hasAnyUserAction } from "./user-actions";

// Permission theo seed V4 của backend.
const ADMIN: CurrentUser = {
  id: "admin",
  email: "admin@test.com",
  displayName: "Admin",
  status: "ACTIVE",
  roles: ["ADMIN"],
  permissions: ["user:read", "user:create", "user:update", "user:lock", "role:read", "role:assign", "role:manage", "session:read-all"],
};
const HR: CurrentUser = {
  ...ADMIN,
  id: "hr",
  roles: ["HR"],
  permissions: ["user:read", "user:create", "user:update", "user:lock", "role:read"],
};
const EMPLOYEE: CurrentUser = { ...ADMIN, id: "emp", roles: ["EMPLOYEE"], permissions: [] };

const target = (status: UserStatus, roles = ["EMPLOYEE"], id = "target"): UserSummary => ({
  id,
  email: "nv@test.com",
  displayName: "Nhân viên",
  status,
  roles,
  lastLoginAt: null,
});

describe("getUserActions", () => {
  it("ADMIN với tài khoản ACTIVE: khóa, vô hiệu hóa, gán role, buộc đăng xuất, xem phiên", () => {
    expect(getUserActions(target("ACTIVE", ["HR"]), ADMIN)).toEqual({
      blocked: null,
      lock: true,
      unlock: false,
      disable: true,
      enable: false,
      assignRoles: true,
      resendActivation: false,
      forceLogout: true,
      viewSessions: true,
    });
  });

  it("HR với tài khoản ADMIN: bị chặn, không có thao tác nào", () => {
    const actions = getUserActions(target("ACTIVE", ["ADMIN"]), HR);
    expect(actions.blocked).toBe("adminProtected");
    expect(hasAnyUserAction(actions)).toBe(false);
  });

  it("ADMIN được thao tác trên ADMIN khác", () => {
    expect(getUserActions(target("ACTIVE", ["ADMIN"]), ADMIN)).toMatchObject({ blocked: null, lock: true });
  });

  it("tài khoản của chính mình: bị chặn, vẫn xem được phiên", () => {
    const actions = getUserActions(target("ACTIVE", ["ADMIN"], "admin"), ADMIN);
    expect(actions.blocked).toBe("self");
    expect(hasAnyUserAction(actions)).toBe(false);
    expect(actions.viewSessions).toBe(true);
  });

  it("LOCKED: chỉ mở khóa hoặc vô hiệu hóa", () => {
    expect(getUserActions(target("LOCKED"), HR)).toMatchObject({
      lock: false,
      unlock: true,
      disable: true,
      forceLogout: false,
    });
  });

  it("DISABLED: chỉ ADMIN kích hoạt lại được", () => {
    expect(getUserActions(target("DISABLED"), ADMIN)).toMatchObject({ enable: true, disable: false });
    const hr = getUserActions(target("DISABLED"), HR);
    expect(hr.enable).toBe(false);
    expect(hasAnyUserAction(hr)).toBe(false);
  });

  it("PENDING: gửi lại mã kích hoạt khi có user:create; HR không gán được role", () => {
    expect(getUserActions(target("PENDING"), HR)).toMatchObject({
      resendActivation: true,
      assignRoles: false,
      lock: false,
      disable: true,
    });
  });

  it("EMPLOYEE (không có quyền): không thấy gì", () => {
    const actions = getUserActions(target("ACTIVE"), EMPLOYEE);
    expect(hasAnyUserAction(actions)).toBe(false);
    expect(actions.viewSessions).toBe(false);
  });
});
