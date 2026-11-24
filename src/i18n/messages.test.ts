import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

/** Mọi key dạng "Nav.items.home" của một file dịch. */
function keysOf(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    value !== null && typeof value === "object" ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe("messages", () => {
  // en.json là chuẩn kiểu (global.d.ts); thiếu key ở vi.json thì người dùng tiếng Việt thấy tên key thay vì chữ.
  it("vi.json có đủ và không thừa key so với en.json", () => {
    expect(keysOf(vi).sort()).toEqual(keysOf(en).sort());
  });

  it("không có bản dịch rỗng", () => {
    for (const [name, messages] of Object.entries({ en, vi })) {
      const empty = keysOf(messages).filter((key) => {
        const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages);
        return typeof value !== "string" || value.trim() === "";
      });
      expect(empty, name).toEqual([]);
    }
  });

  it("formats pending worklog overtime in hours and minutes in both languages", () => {
    const tVi = createTranslator({ locale: "vi", messages: vi, namespace: "ProjectWork" });
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "ProjectWork" });

    expect(tVi("overtimePending", { hours: 1, minutes: 0 })).toBe("Chờ OT · 1g");
    expect(tVi("overtimePending", { hours: 1, minutes: 15 })).toBe("Chờ OT · 1g 15p");
    expect(tVi("overtimePending", { hours: 0, minutes: 15 })).toBe("Chờ OT · 15p");
    expect(tEn("overtimePending", { hours: 1, minutes: 15 })).toBe("Pending OT · 1h 15m");
  });
});
