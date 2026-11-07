import { describe, expect, it } from "vitest";
import { formatMinutes, groupMyWork, loadTone, parseHours, percent, sundayOf, toColumns, workGroup } from "./work-rules";
import { BOARD_STATUSES, type MyWork, type TaskCard } from "./work-types";

describe("formatMinutes", () => {
  it("hiện giờ và phút", () => {
    expect(formatMinutes(480)).toBe("8h");
    expect(formatMinutes(90)).toBe("1h30");
    expect(formatMinutes(-60)).toBe("-1h");
    expect(formatMinutes(null)).toBe("—");
  });
});

describe("parseHours", () => {
  it("nhận nhiều cách nhập", () => {
    expect(parseHours("8")).toBe(480);
    expect(parseHours("1.5")).toBe(90);
    expect(parseHours("1,5")).toBe(90);
    expect(parseHours("1:30")).toBe(90);
  });
  it("trả null khi sai", () => {
    expect(parseHours("")).toBeNull();
    expect(parseHours("abc")).toBeNull();
    expect(parseHours("-1")).toBeNull();
  });
});

describe("gom việc theo hạn", () => {
  // 06/11/2026 là thứ Sáu, Chủ nhật tuần đó là 08/11.
  it("tìm Chủ nhật", () => {
    expect(sundayOf("2026-11-06")).toBe("2026-11-08");
    expect(sundayOf("2026-11-08")).toBe("2026-11-08");
  });
  it("xếp đúng nhóm", () => {
    expect(workGroup(null, "2026-11-06", "2026-11-08")).toBe("noDue");
    expect(workGroup("2026-11-05", "2026-11-06", "2026-11-08")).toBe("overdue");
    expect(workGroup("2026-11-08", "2026-11-06", "2026-11-08")).toBe("thisWeek");
    expect(workGroup("2026-11-09", "2026-11-06", "2026-11-08")).toBe("later");
  });
  it("gom cả danh sách", () => {
    const task = (dueDate: string | null) => ({ card: { dueDate } }) as MyWork["tasks"][number];
    const groups = groupMyWork([task("2026-11-01"), task(null)], "2026-11-06");
    expect(groups.overdue).toHaveLength(1);
    expect(groups.noDue).toHaveLength(1);
  });
});

describe("loadTone", () => {
  it("theo tỉ lệ tải", () => {
    expect(loadTone({ capacityMinutes: 1920, loadMinutes: 2160 })).toBe("over");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 2000 })).toBe("high");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 1000 })).toBe("normal");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 100 })).toBe("low");
    expect(loadTone({ capacityMinutes: 0, loadMinutes: 0 })).toBe("off");
    expect(loadTone({ capacityMinutes: 0, loadMinutes: 60 })).toBe("over");
  });
});

describe("cột board", () => {
  it("chia thẻ theo trạng thái", () => {
    const cards = [{ status: "TODO" }, { status: "DONE" }] as TaskCard[];
    const columns = toColumns(BOARD_STATUSES, cards);
    expect(columns).toHaveLength(4);
    expect(columns[0].cards).toHaveLength(1);
    expect(columns[1].cards).toHaveLength(0);
  });
});

describe("percent", () => {
  it("không vượt 100 và không chia cho 0", () => {
    expect(percent(50, 200)).toBe(25);
    expect(percent(300, 200)).toBe(100);
    expect(percent(1, 0)).toBe(0);
  });
});
