import { describe, expect, it } from "vitest";
import { barLook, phaseColor } from "./timeline-colors";
import {
  barSpan,
  columns,
  lateDays,
  mondayOf,
  monthBands,
  overdueSpan,
  parseZoom,
  shiftedFrom,
  timelineWindow,
} from "./timeline-scale";

// Hôm nay: thứ Tư 25/11/2026.
const TODAY = "2026-11-25";

describe("thang thời gian", () => {
  it("lấy thứ Hai của tuần", () => {
    expect(mondayOf("2026-11-25")).toBe("2026-11-23");
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(mondayOf("2026-11-29")).toBe("2026-11-23");
    expect(mondayOf("không phải ngày")).toBeNull();
  });

  it("khoảng mặc định: Tháng từ thứ Hai tuần trước 10 tuần, Tuần từ thứ Hai tuần này 2 tuần", () => {
    expect(timelineWindow("month", null, TODAY)).toEqual({ from: "2026-11-16", to: "2027-01-24" });
    expect(timelineWindow("week", null, TODAY)).toEqual({ from: "2026-11-23", to: "2026-12-06" });
    expect(timelineWindow("quarter", "2026-12-01", TODAY)).toEqual({ from: "2026-12-01", to: "2027-05-31" });
    expect(timelineWindow("month", "sai", TODAY).from).toBe("2026-11-16");
  });

  it("mức phóng to lạ thì về Tháng; nút ‹ › đi theo bước của mức", () => {
    expect(parseZoom("quarter")).toBe("quarter");
    expect(parseZoom("year")).toBe("month");
    expect(parseZoom(null)).toBe("month");
    expect(shiftedFrom("2026-11-16", "month", 1)).toBe("2026-12-14");
    expect(shiftedFrom("2026-11-23", "week", -1)).toBe("2026-11-16");
  });

  it("cột theo ngày ở mức Tuần (đánh dấu cuối tuần), theo tuần ở mức khác", () => {
    const days = columns({ from: "2026-11-23", to: "2026-12-06" }, "week");
    expect(days).toHaveLength(14);
    expect(days.filter((column) => column.weekend).map((column) => column.date)).toEqual([
      "2026-11-28",
      "2026-11-29",
      "2026-12-05",
      "2026-12-06",
    ]);
    const weeks = columns({ from: "2026-11-16", to: "2027-01-24" }, "month");
    expect(weeks).toHaveLength(10);
    expect(weeks[0]).toMatchObject({ date: "2026-11-16", leftPercent: 0, widthPercent: 10 });
  });

  it("thanh việc chỉ có hạn vẽ một ngày; phần trễ từ sau hạn tới hết hôm nay", () => {
    const window = { from: "2026-11-16", to: "2026-11-25" };
    expect(barSpan(null, "2026-11-20", window)).toMatchObject({ leftPercent: 40, widthPercent: 10 });
    expect(barSpan("2026-11-09", "2026-11-20", window)).toMatchObject({ leftPercent: 0, startsBefore: true });
    expect(overdueSpan("2026-11-20", TODAY, window)).toMatchObject({ start: "2026-11-21", end: "2026-11-25" });
    expect(overdueSpan("2026-11-25", TODAY, window)).toBeNull();
    expect(lateDays("2026-11-20", TODAY)).toBe(5);
    expect(lateDays("2026-11-30", TODAY)).toBe(0);
  });

  it("dải tháng phủ trọn trục, kể cả tháng của ngày đầu", () => {
    const bands = monthBands({ from: "2026-11-16", to: "2027-01-24" });
    expect(bands.map((band) => `${band.month}/${band.year}`)).toEqual(["11/2026", "12/2026", "1/2027"]);
    expect(bands.reduce((sum, band) => sum + band.widthPercent, 0)).toBeCloseTo(100);
  });
});

describe("màu dòng thời gian", () => {
  it("giai đoạn chọn màu biểu đồ, không có nhóm thì xám", () => {
    expect(phaseColor("ANALYSIS_DESIGN")).toBe("var(--chart-5)");
    expect(phaseColor("DEVELOPMENT")).toBe("var(--chart-1)");
    expect(phaseColor("TESTING_OPERATIONS")).toBe("var(--chart-2)");
    expect(phaseColor(null)).toBe("var(--muted-foreground)");
  });

  it("trạng thái quyết định độ đậm", () => {
    expect(barLook("TODO")).toBe("todo");
    expect(barLook("IN_PROGRESS")).toBe("doing");
    expect(barLook("IN_REVIEW")).toBe("doing");
    expect(barLook("DONE")).toBe("done");
  });
});
