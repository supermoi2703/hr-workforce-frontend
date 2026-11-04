import { describe, expect, it } from "vitest";
import {
  availableTabs,
  countByStatus,
  countCatalog,
  dedupeRequirements,
  filterSkills,
  groupByCategory,
  groupCatalog,
  isValidYears,
  parseRequirement,
  parseYears,
  requirementToParam,
  requiresConfirmNote,
  skillStatus,
  SKILL_CODE_PATTERN,
  stateFromSearchParams,
  stateToSearchParams,
} from "./rules";
import type { EmployeeSkill, Skill, SkillTab } from "./types";

const ALL_TABS: SkillTab[] = ["mine", "pending", "search", "catalog"];

const skill = (overrides: Partial<Skill>): Skill => ({
  id: "s",
  code: "S",
  name: "S",
  category: "OTHER",
  description: null,
  active: true,
  ...overrides,
});

const employeeSkill = (overrides: Partial<EmployeeSkill>): EmployeeSkill => ({
  skillId: "java",
  skillCode: "JAVA",
  skillName: "Java",
  category: "PROGRAMMING_LANGUAGE",
  skillActive: true,
  selfLevel: 3,
  confirmedLevel: null,
  level: 3,
  confirmed: false,
  yearsExperience: null,
  note: null,
  confirmedByEmployeeId: null,
  confirmedAt: null,
  updatedAt: "2026-11-03T00:00:00Z",
  confirmedNote: null,
  confirmedByName: null,
  ...overrides,
});

describe("availableTabs", () => {
  it("employee only sees their own skills", () => {
    expect(availableTabs(() => false, false)).toEqual(["mine"]);
  });

  it("the queue follows canVerify, not the role: a team lead with the Employee role gets it", () => {
    expect(availableTabs(() => false, true)).toEqual(["mine", "pending"]);
    // Manager không làm trưởng đơn vị nào: có quyền tìm nhưng không có ai để xác nhận
    const manager = new Set(["skill:verify", "skill:read"]);
    expect(availableTabs((p) => manager.has(p), false)).toEqual(["mine", "search"]);
  });

  it("HR with people in scope gets every tab", () => {
    const hr = new Set(["skill:verify", "skill:read", "skill:manage"]);
    expect(availableTabs((p) => hr.has(p), true)).toEqual(ALL_TABS);
  });
});

describe("requiresConfirmNote", () => {
  it("is required only when the level differs from a self-declared one", () => {
    expect(requiresConfirmNote(4, 3)).toBe(true);
    expect(requiresConfirmNote(4, 4)).toBe(false);
    expect(requiresConfirmNote(null, 2)).toBe(false); // thêm hộ
    expect(requiresConfirmNote(undefined, 2)).toBe(false);
    expect(requiresConfirmNote(4, null)).toBe(false); // chưa chọn mức
  });
});

describe("requirements", () => {
  it("parses CODE and CODE:level, defaulting the level to 1 like the backend", () => {
    expect(parseRequirement("java:3")).toEqual({ code: "JAVA", minLevel: 3 });
    expect(parseRequirement("SPRING_BOOT")).toEqual({ code: "SPRING_BOOT", minLevel: 1 });
    expect(parseRequirement("SPRING_BOOT:")).toEqual({ code: "SPRING_BOOT", minLevel: 1 });
  });

  it("rejects bad codes and levels outside 1–5", () => {
    expect(parseRequirement("J")).toBeNull();
    expect(parseRequirement("JAVA:0")).toBeNull();
    expect(parseRequirement("JAVA:6")).toBeNull();
    expect(parseRequirement("JAVA:2.5")).toBeNull();
    expect(parseRequirement("JAVA:3:4")).toBeNull();
    expect(parseRequirement("JA VA")).toBeNull();
  });

  it("round-trips to the query format and keeps the first of duplicates", () => {
    expect(requirementToParam({ code: "JAVA", minLevel: 3 })).toBe("JAVA:3");
    expect(
      dedupeRequirements([
        { code: "JAVA", minLevel: 3 },
        { code: "JAVA", minLevel: 5 },
        { code: "SQL", minLevel: 1 },
      ]),
    ).toEqual([
      { code: "JAVA", minLevel: 3 },
      { code: "SQL", minLevel: 1 },
    ]);
  });

  it("code pattern matches the backend", () => {
    expect(SKILL_CODE_PATTERN.test("SPRING_BOOT")).toBe(true);
    expect(SKILL_CODE_PATTERN.test("c-sharp")).toBe(true);
    expect(SKILL_CODE_PATTERN.test("_JAVA")).toBe(false);
    expect(SKILL_CODE_PATTERN.test("A".repeat(51))).toBe(false);
  });
});

describe("URL state", () => {
  it("falls back to 'mine' for unknown or forbidden tabs", () => {
    expect(stateFromSearchParams(new URLSearchParams("tab=catalog"), ["mine"]).tab).toBe("mine");
    expect(stateFromSearchParams(new URLSearchParams("tab=nope"), ALL_TABS).tab).toBe("mine");
  });

  it("reads and writes the search criteria", () => {
    const params = new URLSearchParams("tab=search&require=java:3&require=SPRING_BOOT&require=bad code&require=JAVA:5&office=o1&confirmed=1");
    const state = stateFromSearchParams(params, ALL_TABS);
    expect(state).toEqual({
      tab: "search",
      criteria: {
        requirements: [
          { code: "JAVA", minLevel: 3 },
          { code: "SPRING_BOOT", minLevel: 1 },
        ],
        officeId: "o1",
        departmentId: undefined,
        teamId: undefined,
        confirmedOnly: true,
      },
    });
    expect(stateToSearchParams(state).toString()).toBe("tab=search&require=JAVA%3A3&require=SPRING_BOOT%3A1&office=o1&confirmed=1");
  });

  it("caps requirements at 10 and drops criteria outside the search tab", () => {
    const many = Array.from({ length: 12 }, (_, i) => `require=SKILL${i}`).join("&");
    expect(stateFromSearchParams(new URLSearchParams(`tab=search&${many}`), ALL_TABS).criteria.requirements).toHaveLength(10);
    const state = stateFromSearchParams(new URLSearchParams("tab=search&require=JAVA"), ALL_TABS);
    expect(stateToSearchParams({ ...state, tab: "pending" }).toString()).toBe("tab=pending");
    expect(stateToSearchParams({ ...state, tab: "mine" }).toString()).toBe("");
  });
});

describe("skillStatus", () => {
  it("covers pending, confirmed, adjusted and added by manager", () => {
    expect(skillStatus(employeeSkill({}))).toBe("pending");
    expect(skillStatus(employeeSkill({ confirmed: true, confirmedLevel: 3 }))).toBe("confirmed");
    expect(skillStatus(employeeSkill({ confirmed: true, selfLevel: 4, confirmedLevel: 3 }))).toBe("adjusted");
    expect(skillStatus(employeeSkill({ confirmed: true, selfLevel: null, confirmedLevel: 2 }))).toBe("addedByManager");
  });

  it("counts confirmed and pending", () => {
    expect(countByStatus([employeeSkill({}), employeeSkill({ confirmed: true, confirmedLevel: 3 })])).toEqual({
      total: 2,
      pending: 1,
      confirmed: 1,
    });
  });
});

describe("catalog helpers", () => {
  const skills = [
    skill({ id: "en", code: "ENGLISH", name: "Tiếng Anh", category: "FOREIGN_LANGUAGE" }),
    skill({ id: "java", code: "JAVA", name: "Java", category: "PROGRAMMING_LANGUAGE" }),
    skill({ id: "cobol", code: "COBOL", name: "COBOL", category: "PROGRAMMING_LANGUAGE", active: false }),
  ];

  it("groups in backend category order and drops empty groups", () => {
    expect(groupByCategory(skills).map((g) => [g.category, g.items.map((s) => s.id)])).toEqual([
      ["PROGRAMMING_LANGUAGE", ["java", "cobol"]],
      ["FOREIGN_LANGUAGE", ["en"]],
    ]);
  });

  it("filters by accent-insensitive text, category and status", () => {
    expect(filterSkills(skills, { text: "tieng anh", status: "active" }).map((s) => s.id)).toEqual(["en"]);
    expect(filterSkills(skills, { text: "", category: "PROGRAMMING_LANGUAGE", status: "active" }).map((s) => s.id)).toEqual(["java"]);
    expect(filterSkills(skills, { text: "", status: "inactive" }).map((s) => s.id)).toEqual(["cobol"]);
    expect(filterSkills(skills, { text: "cob", status: "all" }).map((s) => s.id)).toEqual(["cobol"]);
  });

  it("puts inactive skills last in their group and counts by status", () => {
    const withInactiveFirst = [skills[2], skills[1], skills[0]];
    expect(groupCatalog(withInactiveFirst).map((g) => [g.category, g.items.map((s) => s.id)])).toEqual([
      ["PROGRAMMING_LANGUAGE", ["java", "cobol"]],
      ["FOREIGN_LANGUAGE", ["en"]],
    ]);
    expect(countCatalog(skills)).toEqual({ active: 2, inactive: 1, all: 3 });
  });
});

describe("years of experience", () => {
  it("parses blank as null and accepts a decimal comma", () => {
    expect(parseYears("  ")).toBeNull();
    expect(parseYears("1,5")).toBe(1.5);
  });

  it("allows 0–50 with one decimal", () => {
    expect(isValidYears(null)).toBe(true);
    expect(isValidYears(0)).toBe(true);
    expect(isValidYears(2.5)).toBe(true);
    expect(isValidYears(50)).toBe(true);
    expect(isValidYears(2.55)).toBe(false);
    expect(isValidYears(-1)).toBe(false);
    expect(isValidYears(51)).toBe(false);
    expect(isValidYears(Number.NaN)).toBe(false);
  });
});
