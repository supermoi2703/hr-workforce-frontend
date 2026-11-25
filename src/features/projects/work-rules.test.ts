import { describe, expect, it } from "vitest";
import {
  applyAiProfile,
  assignWarning,
  hoursText,
  needsConfirm,
  applyCategory,
  applySuggestion,
  dateRangeValid,
  differsFromSuggestion,
  formatMinutes,
  groupMyWork,
  loadTone,
  minutesToHoursText,
  parseHours,
  percent,
  scheduleInfo,
  skillFitText,
  suggestionLines,
  sundayOf,
  toColumns,
  workGroup,
  type CategoryDraft,
} from "./work-rules";
import {
  BOARD_STATUSES,
  type AssignPreview,
  type LoadSummary,
  type MyWork,
  type SuggestionCandidate,
  type TaskCard,
  type WorkCategory,
} from "./work-types";

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
    expect(loadTone({ capacityMinutes: 1920, loadMinutes: 2600, zone: "RED", flags: ["OVERLOADED"] })).toBe("over");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 2880, zone: "YELLOW", flags: ["OVERLOADED"] })).toBe("high");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 1000, zone: "GREEN", flags: [] })).toBe("normal");
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 100, zone: "GREEN", flags: ["IDLE"] })).toBe("low");
    // Sau hạn xa nhất của các việc đã lên lịch: chưa lên lịch, không phải rảnh
    expect(loadTone({ capacityMinutes: 2400, loadMinutes: 0, zone: "GREEN", flags: ["NOT_PLANNED"] })).toBe("notPlanned");
    expect(loadTone({ capacityMinutes: 0, loadMinutes: 0, zone: "GREEN", flags: ["ON_LEAVE"] })).toBe("off");
    expect(loadTone({ capacityMinutes: 0, loadMinutes: 60, zone: "RED", flags: ["OVERLOADED"] })).toBe("over");
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

const API: WorkCategory = {
  id: "c1",
  code: "API",
  name: "API nghiệp vụ",
  description: null,
  phase: "DEVELOPMENT",
  defaultMinutes: 480,
  sortOrder: 4,
  active: true,
  skills: [
    { skillId: "java", minLevel: 2 },
    { skillId: "sql", minLevel: 2 },
  ],
};
const EMPTY: CategoryDraft = { estimate: "", skills: [], estimateTouched: false, skillsTouched: false };

describe("work categories", () => {
  it("fills hours and skills of a new task", () => {
    const next = applyCategory(EMPTY, API, "create");
    expect(next.estimate).toBe("8");
    expect(next.skills).toEqual([
      { skillId: "java", minLevel: 2 },
      { skillId: "sql", minLevel: 2 },
    ]);
  });

  it("keeps what the PM typed", () => {
    const typed = { ...EMPTY, estimate: "40", estimateTouched: true };
    const next = applyCategory(typed, API, "create");
    expect(next.estimate).toBe("40");
    expect(next.skills).toHaveLength(2);
  });

  it("never overwrites an existing task, only offers the suggestion", () => {
    const existing = { ...EMPTY, estimate: "16", skills: [{ skillId: "java", minLevel: 3 }] };
    expect(applyCategory(existing, API, "edit")).toEqual(existing);
    expect(differsFromSuggestion(existing, API)).toBe(true);
    const applied = applySuggestion(existing, API);
    expect(differsFromSuggestion(applied, API)).toBe(false);
  });

  it("compares skills regardless of order", () => {
    const draft = { estimate: "8", skills: [{ skillId: "sql", minLevel: 2 }, { skillId: "java", minLevel: 2 }] };
    expect(differsFromSuggestion(draft, API)).toBe(false);
    expect(differsFromSuggestion({ ...draft, skills: [{ skillId: "sql", minLevel: 2 }, { skillId: "java", minLevel: null }] }, API)).toBe(true);
  });

  it("applies an AI profile: category hours, AI skills, and later category changes keep those skills", () => {
    const typed = { ...EMPTY, estimate: "40", estimateTouched: true, skills: [{ skillId: "sql", minLevel: 3 }] };
    const profile = {
      category: { defaultMinutes: 720 },
      skills: [
        { skillId: "react", minLevel: 3 },
        { skillId: "ts", minLevel: null },
      ],
    };
    const next = applyAiProfile(typed, profile);
    expect(next.estimate).toBe("12");
    expect(next.estimateTouched).toBe(false);
    expect(next.skills).toEqual([
      { skillId: "react", minLevel: 3 },
      { skillId: "ts", minLevel: null },
    ]);
    expect(applyCategory(next, API, "create").skills).toEqual(next.skills);
  });

  it("an AI profile without a category keeps the estimate the PM typed", () => {
    const typed = { ...EMPTY, estimate: "6", estimateTouched: true };
    const next = applyAiProfile(typed, { category: null, skills: [{ skillId: "java", minLevel: 2 }] });
    expect(next.estimate).toBe("6");
    expect(next.estimateTouched).toBe(true);
    expect(next.skills).toEqual([{ skillId: "java", minLevel: 2 }]);
  });

  it("writes hours for the estimate box", () => {
    expect(minutesToHoursText(480)).toBe("8");
    expect(minutesToHoursText(90)).toBe("1.5");
  });
});

describe("task dates", () => {
  it("rejects a start after the due date", () => {
    expect(dateRangeValid("2026-04-10", "2026-04-08")).toBe(false);
    expect(dateRangeValid("2026-04-08", "2026-04-08")).toBe(true);
    expect(dateRangeValid(null, "2026-04-08")).toBe(true);
  });

  it("tells which dates come from the sprint", () => {
    expect(scheduleInfo({ startDate: null, dueDate: "2026-04-09", scheduledStart: "2026-04-06", scheduledEnd: "2026-04-09" })).toEqual({
      start: "2026-04-06",
      end: "2026-04-09",
      startFromSprint: true,
      endFromSprint: false,
    });
    expect(scheduleInfo({ startDate: null, dueDate: null, scheduledStart: null, scheduledEnd: null })).toEqual({
      start: null,
      end: null,
      startFromSprint: false,
      endFromSprint: false,
    });
  });
});

describe("cảnh báo tải khi giao việc", () => {
  const load = (zone: LoadSummary["zone"]): LoadSummary => ({
    zone,
    reasons: zone === "GREEN" ? [] : ["WEEK_OVER_CAPACITY"],
    peakWeek: { weekStart: "2026-11-23", capacityMinutes: 2400, loadMinutes: zone === "GREEN" ? 1920 : 2880, percent: zone === "GREEN" ? 80 : 120, zone },
    unscheduledMinutes: 0,
    weeks: [],
  });
  const preview = (zone: LoadSummary["zone"]): AssignPreview => ({ scheduled: true, load: load(zone) });

  it("xanh, chưa có kết quả hoặc việc chưa lên lịch thì không cảnh báo", () => {
    expect(assignWarning(preview("GREEN"))).toBeNull();
    expect(assignWarning(undefined)).toBeNull();
    expect(assignWarning({ scheduled: false, load: null })).toBeNull();
  });

  it("vàng chỉ cảnh báo, đỏ phải xác nhận; server không chặn", () => {
    expect(assignWarning(preview("YELLOW"))).toMatchObject({ zone: "YELLOW", peak: { percent: 120 } });
    expect(needsConfirm(preview("YELLOW"))).toBe(false);
    expect(needsConfirm(preview("RED"))).toBe(true);
    expect(needsConfirm(null)).toBe(false);
  });

  it("giờ hiển thị dùng dấu phẩy thập phân", () => {
    expect(hoursText(2880)).toBe("48");
    expect(hoursText(90)).toBe("1,5");
  });
});

describe("suggestionLines", () => {
  const peak = { weekStart: "2026-04-06", capacityMinutes: 2400, loadMinutes: 840, percent: 35, zone: "GREEN" as const };
  const candidate = (overrides: Partial<SuggestionCandidate> = {}): SuggestionCandidate => ({
    person: { id: "an", employeeCode: "AN", fullName: "An" },
    officeId: null,
    member: false,
    load: { zone: "GREEN", reasons: [], peakWeek: peak, unscheduledMinutes: 0, weeks: [] },
    skills: [{ skillId: "java", skillName: "Java", level: 3, minLevel: 2, confirmed: true }],
    reasons: [
      { code: "SKILLS_MATCH", taskKey: null, date: null, amount: null },
      { code: "ENDS_BEFORE_START", taskKey: null, date: "2026-04-03", amount: null },
      { code: "NOT_MEMBER", taskKey: null, date: null, amount: null },
    ],
    leaveDays: 0,
    leaveOnDue: false,
    ...overrides,
  });

  it("kỹ năng, tuần nặng nhất rồi một lý do phụ; không lặp 'chưa ở dự án'", () => {
    const lines = suggestionLines(candidate());
    expect(lines.map((line) => line.kind)).toEqual(["skills", "peak", "reason"]);
    expect(lines[2]).toMatchObject({ kind: "reason", reason: { code: "ENDS_BEFORE_START", date: "2026-04-03" } });
  });

  it("nghỉ đúng ngày hạn được ưu tiên hơn việc kết thúc trước", () => {
    const lines = suggestionLines(
      candidate({
        reasons: [
          { code: "SKILLS_MATCH", taskKey: null, date: null, amount: null },
          { code: "ENDS_BEFORE_START", taskKey: "CRM-3", date: "2026-04-03", amount: null },
          { code: "LEAVE_ON_DUE", taskKey: null, date: null, amount: null },
        ],
      }),
    );
    expect(lines[2]).toMatchObject({ reason: { code: "LEAVE_ON_DUE" } });
  });

  it("đánh dấu dưới mức và tự khai; việc không khai kỹ năng thì bỏ dòng kỹ năng", () => {
    const below = suggestionLines(
      candidate({
        reasons: [
          { code: "BELOW_MIN_LEVEL", taskKey: null, date: null, amount: null },
          { code: "SKILL_UNCONFIRMED", taskKey: null, date: null, amount: null },
        ],
      }),
    );
    expect(below[0]).toMatchObject({ kind: "skills", belowMin: true, unconfirmed: true });
    expect(suggestionLines(candidate({ skills: [], reasons: [] })).map((line) => line.kind)).toEqual(["peak"]);
  });

  it("ghi mức tối thiểu cạnh kỹ năng dưới mức", () => {
    const text = skillFitText(
      [
        { skillId: "java", skillName: "Java", level: 3, minLevel: 2, confirmed: true },
        { skillId: "sql", skillName: "SQL", level: 1, minLevel: 3, confirmed: false },
      ],
      (min) => `(cần ≥ ${min})`,
    );
    expect(text).toBe("Java 3, SQL 1 (cần ≥ 3)");
  });
});
