import { describe, expect, it } from "vitest";
import { dayCells, heatLevel, weekCells, zoneOf } from "./load-cells";

describe("ô tải", () => {
  it("vùng của một ngày: ≤ 100% xanh, ≤ 125% vàng, trên nữa hoặc quá 12 giờ đỏ", () => {
    expect(zoneOf(480, 480)).toBe("GREEN");
    expect(zoneOf(600, 480)).toBe("YELLOW");
    expect(zoneOf(601, 480)).toBe("RED");
    expect(zoneOf(60, 0)).toBe("RED");
    expect(zoneOf(780, 1200, true)).toBe("RED");
  });

  it("ô theo ngày bỏ ngày không có năng lực lẫn việc, giữ ngày nghỉ có OT", () => {
    const cells = dayCells([
      { date: "2026-11-23", capacityMinutes: 480, loadMinutes: 300, overtimeMinutes: 0, leave: "NONE" },
      { date: "2026-11-26", capacityMinutes: 240, loadMinutes: 0, overtimeMinutes: 0, leave: "HALF" },
      { date: "2026-11-28", capacityMinutes: 240, loadMinutes: 240, overtimeMinutes: 240, leave: "NONE" },
      { date: "2026-11-29", capacityMinutes: 0, loadMinutes: 0, overtimeMinutes: 0, leave: "NONE" },
    ]);
    expect(cells.map((cell) => cell.key)).toEqual(["2026-11-23", "2026-11-26", "2026-11-28"]);
    expect(cells[1].note).toBe("½");
    expect(cells[2]).toMatchObject({ overtimeMinutes: 240, zone: "GREEN" });
  });

  it("ô theo tuần ghi %, tuần không có năng lực lẫn việc ghi chữ nghỉ", () => {
    const cells = weekCells(
      [
        { weekStart: "2026-11-23", capacityMinutes: 2400, loadMinutes: 2760, percent: 115, zone: "YELLOW", overtimeMinutes: 240 },
        { weekStart: "2026-11-30", capacityMinutes: 0, loadMinutes: 0, percent: 0, zone: "GREEN" },
      ],
      "nghỉ",
    );
    expect(cells[0]).toMatchObject({ end: "2026-11-29", note: "115%", overtimeMinutes: 240 });
    expect(cells[1]).toMatchObject({ note: "nghỉ", overtimeMinutes: 0 });
  });

  it("bậc màu bảng nhiệt đậm dần theo %", () => {
    expect(heatLevel(0, 2400, true)).toBe("leave");
    expect(heatLevel(0, 2400, false)).toBe("empty");
    expect(heatLevel(1200, 2400, false)).toBe("light");
    expect(heatLevel(2000, 2400, false)).toBe("medium");
    expect(heatLevel(2400, 2400, false)).toBe("full");
    expect(heatLevel(3000, 2400, false)).toBe("over");
    expect(heatLevel(3100, 2400, false)).toBe("overload");
    expect(heatLevel(60, 0, false)).toBe("overload");
  });
});
