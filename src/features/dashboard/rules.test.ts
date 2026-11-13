import { describe, expect, it } from "vitest";
import {
  availableTabs,
  billableSplit,
  change,
  filtersFromSearchParams,
  filtersToSearchParams,
  foldParts,
  heatLevel,
  lastTwo,
  resolveTab,
  resourceRange,
  weekDays,
  withSeriesColors,
} from "./rules";

const OFFICE = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";

describe("bộ lọc trên URL", () => {
  it("đọc giá trị hợp lệ, bỏ giá trị lạ", () => {
    expect(filtersFromSearchParams(new URLSearchParams(`officeId=${OFFICE}&departmentId=abc&weeks=12`))).toEqual({
      officeId: OFFICE,
      departmentId: undefined,
      weeks: 12,
    });
    expect(filtersFromSearchParams(new URLSearchParams("weeks=7")).weeks).toBe(8);
  });

  it("không ghi giá trị mặc định", () => {
    expect(filtersToSearchParams({ weeks: 8 }).toString()).toBe("");
    expect(filtersToSearchParams({ officeId: OFFICE, weeks: 4 }).toString()).toBe(`officeId=${OFFICE}&weeks=4`);
  });
});

describe("khoảng ngày", () => {
  it("bắt đầu từ thứ Hai của tuần, đủ số tuần", () => {
    // 13/11/2026 là thứ Sáu
    expect(resourceRange("2026-11-13", 8)).toEqual({ from: "2026-11-09", to: "2027-01-03" });
    // Chủ nhật thuộc tuần bắt đầu thứ Hai trước đó
    expect(resourceRange("2026-11-15", 4)).toEqual({ from: "2026-11-09", to: "2026-12-06" });
  });

  it("liệt kê 7 ngày của tuần, qua được ranh giới tháng", () => {
    expect(weekDays("2026-11-30")).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
  });
});

describe("biểu đồ", () => {
  it("bậc màu heatmap theo % và trần", () => {
    expect([null, 0, 30, 70, 90, 100, 120].map((value) => heatLevel(value, 100))).toEqual([null, 0, 1, 2, 3, 4, "over"]);
  });

  it("thanh tính phí luôn cộng đủ 100", () => {
    expect(billableSplit(70, 50)).toEqual({ billable: 50, nonBillable: 20, free: 30 });
    expect(billableSplit(120, 80)).toEqual({ billable: 80, nonBillable: 20, free: 0 });
    expect(billableSplit(0, 0)).toEqual({ billable: 0, nonBillable: 0, free: 100 });
  });
});

describe("tab", () => {
  it("nhân viên chỉ có Của tôi; người quản lý có Tổng quan ở đầu", () => {
    expect(availableTabs(["ME"])).toEqual(["me"]);
    expect(availableTabs(["ME", "TEAM", "RESOURCES"])).toEqual(["overview", "resources", "team", "me"]);
    expect(availableTabs(["ME", "HR", "RESOURCES"])).toEqual(["overview", "resources", "hr", "me"]);
  });

  it("tab trên URL không được xem thì về tab đầu", () => {
    expect(resolveTab("hr", ["overview", "team", "me"])).toBe("overview");
    expect(resolveTab("team", ["overview", "team", "me"])).toBe("team");
    expect(resolveTab(undefined, ["me"])).toBe("me");
  });

  it("đọc / ghi tab trên URL", () => {
    expect(filtersFromSearchParams(new URLSearchParams("tab=hr")).tab).toBe("hr");
    expect(filtersFromSearchParams(new URLSearchParams("tab=x")).tab).toBeUndefined();
    expect(filtersToSearchParams({ tab: "team", weeks: 8 }).toString()).toBe("tab=team");
  });
});

describe("so sánh và donut", () => {
  it("chênh lệch có hướng; thiếu số thì null", () => {
    expect(change(5, 8)).toEqual({ value: 3, direction: "up" });
    expect(change(8, 5)).toEqual({ value: -3, direction: "down" });
    expect(change(4, 4)).toEqual({ value: 0, direction: "flat" });
    expect(change(null, 4)).toBeNull();
    expect(lastTwo([1, 2, 3])).toEqual({ previous: 2, current: 3 });
    expect(lastTwo([7])).toEqual({ previous: null, current: 7 });
  });

  it("màu gắn theo nhóm, không đổi khi nhóm khác bằng 0", () => {
    const parts = withSeriesColors([
      { key: "a", label: "A", value: 0 },
      { key: "b", label: "B", value: 3 },
    ]);
    expect(foldParts(parts, 6, "Khác")).toEqual([{ key: "b", label: "B", value: 3, color: "var(--chart-3)" }]);
  });

  it("quá số phần thì gộp phần nhỏ thành Khác, giữ thứ tự gốc", () => {
    const parts = withSeriesColors(
      [5, 1, 4, 2, 3].map((value, index) => ({ key: `k${index}`, label: `K${index}`, value })),
    );
    expect(foldParts(parts, 3, "Khác").map((part) => [part.key, part.value])).toEqual([
      ["k0", 5],
      ["k2", 4],
      ["other", 6],
    ]);
  });
});

