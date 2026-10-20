import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPendingNext, safeNextPath, savePendingNext } from "./next-path";

describe("safeNextPath", () => {
  it("giữ đường dẫn trong app", () => {
    expect(safeNextPath("/leave")).toBe("/leave");
    expect(safeNextPath("/admin/users?page=2")).toBe("/admin/users?page=2");
  });

  it("đường dẫn ra ngoài hoặc rỗng thì về trang chủ", () => {
    for (const next of [undefined, null, "", "leave", "//evil.com", "/\\evil.com", "https://evil.com"]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });
});

describe("pending next (giữ ?next qua đăng nhập Google)", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lưu rồi đọc lại; lần lưu sau ghi đè", () => {
    savePendingNext("/leave");
    expect(readPendingNext()).toBe("/leave");
    savePendingNext(undefined);
    expect(readPendingNext()).toBe("/");
  });

  it("chưa lưu gì hoặc giá trị không an toàn thì về trang chủ", () => {
    expect(readPendingNext()).toBe("/");
    savePendingNext("//evil.com");
    expect(readPendingNext()).toBe("/");
  });

  it("storage bị chặn thì không lỗi", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => savePendingNext("/leave")).not.toThrow();
    expect(readPendingNext()).toBe("/");
  });
});
