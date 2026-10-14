import { describe, expect, it } from "vitest";
import { createMockUser } from "./mock-users";
import { canAccess } from "./permissions";

describe("canAccess", () => {
  const hr = createMockUser("HR");
  const employee = createMockUser("EMPLOYEE");

  it("không có điều kiện: ai đăng nhập cũng được, chưa đăng nhập thì không", () => {
    expect(canAccess(employee)).toBe(true);
    expect(canAccess(employee, {})).toBe(true);
    expect(canAccess(null)).toBe(false);
  });

  it("thỏa khi có một trong các role", () => {
    expect(canAccess(hr, { roles: ["ADMIN", "HR"] })).toBe(true);
    expect(canAccess(employee, { roles: ["ADMIN", "HR"] })).toBe(false);
  });

  it("thỏa khi có role HOẶC permission", () => {
    expect(canAccess(hr, { permissions: ["user:read"] })).toBe(true);
    expect(canAccess(hr, { permissions: ["role:manage"] })).toBe(false);
    expect(canAccess(hr, { roles: ["ADMIN"], permissions: ["user:lock"] })).toBe(true);
  });
});
