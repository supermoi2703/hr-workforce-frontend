import { describe, expect, it } from "vitest";
import { displayName, employeeLabel } from "./names";

const ID = "123e4567-e89b-12d3-a456-426614174000";

describe("displayName", () => {
  it("dùng tên khi có", () => {
    expect(displayName("Văn Lan", ID)).toBe("Văn Lan");
  });

  it("không có tên (null, undefined, rỗng) thì 8 ký tự đầu của id", () => {
    expect(displayName(null, ID)).toBe("123e4567");
    expect(displayName(undefined, ID)).toBe("123e4567");
    expect(displayName("   ", ID)).toBe("123e4567");
  });

  it("không có cả hai thì dấu gạch", () => {
    expect(displayName(null, null)).toBe("—");
  });
});

describe("employeeLabel", () => {
  it("mã — họ tên khi đủ", () => {
    expect(employeeLabel("NV001", "Trần B", ID)).toBe("NV001 — Trần B");
  });

  it("thiếu một phần thì hiện phần còn lại, thiếu cả hai thì id rút gọn", () => {
    expect(employeeLabel("NV001", null, ID)).toBe("NV001");
    expect(employeeLabel(null, "Trần B", ID)).toBe("Trần B");
    expect(employeeLabel(null, null, ID)).toBe("123e4567");
  });
});
