import { describe, expect, it } from "vitest";
import { partOfDay, partOfDayInVietnam } from "./greeting";

describe("partOfDay", () => {
  it("chia buổi theo ranh giới 11, 14, 18 giờ", () => {
    expect(partOfDay(0)).toBe("morning");
    expect(partOfDay(10)).toBe("morning");
    expect(partOfDay(11)).toBe("noon");
    expect(partOfDay(13)).toBe("noon");
    expect(partOfDay(14)).toBe("afternoon");
    expect(partOfDay(17)).toBe("afternoon");
    expect(partOfDay(18)).toBe("evening");
    expect(partOfDay(23)).toBe("evening");
  });

  it("tính theo giờ Việt Nam (UTC+7), không theo giờ máy", () => {
    expect(partOfDayInVietnam(new Date("2026-11-17T13:12:00Z"))).toBe("evening"); // 20:12 ở Việt Nam
    expect(partOfDayInVietnam(new Date("2026-11-17T01:30:00Z"))).toBe("morning"); // 08:30
    expect(partOfDayInVietnam(new Date("2026-11-17T17:30:00Z"))).toBe("morning"); // 00:30 hôm sau
  });
});
