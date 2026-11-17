import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, resolveLocale } from "./config";

describe("resolveLocale", () => {
  it("giữ ngôn ngữ được hỗ trợ", () => {
    expect(resolveLocale("vi")).toBe("vi");
    expect(resolveLocale("en")).toBe("en");
  });

  it("thiếu hoặc lạ (cookie bị sửa tay) thì về mặc định tiếng Việt", () => {
    expect(DEFAULT_LOCALE).toBe("vi");
    for (const value of [undefined, null, "", "fr", "EN", "en-US", 1]) {
      expect(resolveLocale(value)).toBe("vi");
    }
  });
});
