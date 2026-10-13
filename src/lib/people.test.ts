import { describe, expect, it } from "vitest";
import { getAvatarHue, getInitials } from "./people";

describe("getInitials", () => {
  it("lấy chữ đầu của họ và tên", () => {
    expect(getInitials("Nguyễn Văn An")).toBe("NA");
    expect(getInitials("Đặng Khánh")).toBe("ĐK");
    expect(getInitials("  lê   thị   ánh  ")).toBe("LÁ");
  });

  it("một từ, bỏ phần trong ngoặc, chuỗi rỗng", () => {
    expect(getInitials("Minh")).toBe("M");
    expect(getInitials("Quản trị viên (demo)")).toBe("QV");
    expect(getInitials("")).toBe("?");
  });
});

describe("getAvatarHue", () => {
  it("cùng seed luôn cùng màu", () => {
    expect(getAvatarHue("NV0001")).toBe(getAvatarHue("NV0001"));
  });

  it("các seed khác nhau dùng nhiều màu khác nhau", () => {
    const hues = new Set(Array.from({ length: 50 }, (_, i) => getAvatarHue(`NV${i}`)));
    expect(hues.size).toBeGreaterThan(4);
  });
});
