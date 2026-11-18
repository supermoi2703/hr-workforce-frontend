import { describe, expect, it } from "vitest";
import {
  chartSummary,
  decodeNode,
  departmentSummary,
  directorOf,
  encodeNode,
  filterDepartments,
  foldText,
  leaderRoles,
  managerOf,
  memberFilters,
  resolveNode,
  splitTeams,
  stateFromSearchParams,
  stateToSearchParams,
  unitLedBy,
  UNIT_CODE_PATTERN,
} from "./rules";
import type { OrgChart, OrgChartDepartment, OrgChartMember } from "./types";

const person = (id: string, fullName: string) => ({ id, employeeCode: `NV-${id}`, fullName });

const bgd: OrgChartDepartment = {
  id: "bgd",
  code: "BGD",
  name: "Ban Giám đốc",
  executive: true,
  head: person("gd", "Giám Đốc"),
  employeeCount: 2,
  withoutTeamCount: 2,
  directStaffCount: 1,
  restricted: false,
  teams: [],
};
const ptpm: OrgChartDepartment = {
  id: "ptpm",
  code: "PTPM",
  name: "Phòng Phát triển phần mềm",
  executive: false,
  head: person("chi", "Chi"),
  employeeCount: 9,
  withoutTeamCount: 2,
  directStaffCount: 1,
  restricted: false,
  teams: [
    { id: "be", code: "BACKEND", name: "Team Backend", lead: person("binh", "Bình"), employeeCount: 6, restricted: false },
    { id: "qa", code: "QA", name: "Đảm bảo chất lượng", lead: null, employeeCount: 1, restricted: false },
  ],
};
const chart: OrgChart = { employeeCount: 11, departments: [bgd, ptpm] };

describe("node encoding", () => {
  it("round-trips every node kind", () => {
    for (const node of [
      { kind: "department", id: "a" },
      { kind: "team", id: "b" },
      { kind: "noTeam", departmentId: "c" },
    ] as const) {
      expect(decodeNode(encodeNode(node))).toEqual(node);
    }
  });

  it("ignores unknown or empty values", () => {
    expect(decodeNode("x:1")).toBeUndefined();
    expect(decodeNode("d:")).toBeUndefined();
    expect(decodeNode(null)).toBeUndefined();
  });
});

describe("URL state", () => {
  it("keeps the office only in office view", () => {
    expect(stateFromSearchParams(new URLSearchParams("office=hn&node=t:be"))).toEqual({
      view: "department",
      officeId: undefined,
      node: { kind: "team", id: "be" },
      keyword: undefined,
    });
    const state = stateFromSearchParams(new URLSearchParams("view=office&office=hn&q=%20an%20"));
    expect(state).toMatchObject({ view: "office", officeId: "hn", keyword: "an" });
    expect(stateToSearchParams(state).toString()).toBe("view=office&office=hn&q=an");
  });
});

describe("memberFilters", () => {
  it("maps each node to the members API filters and adds the office in office view", () => {
    expect(memberFilters({ view: "department", node: { kind: "team", id: "be" } })).toEqual({
      officeId: undefined,
      teamId: "be",
    });
    expect(memberFilters({ view: "office", officeId: "dn", node: { kind: "noTeam", departmentId: "ptpm" } })).toEqual({
      officeId: "dn",
      departmentId: "ptpm",
      withoutTeam: true,
    });
  });

  it("searches the whole scope when there is a keyword", () => {
    expect(memberFilters({ view: "office", officeId: "hn", node: { kind: "department", id: "ptpm" }, keyword: "an" })).toEqual({
      officeId: "hn",
      keyword: "an",
    });
  });
});

describe("resolveNode", () => {
  it("finds the node and its department", () => {
    expect(resolveNode(chart, { kind: "team", id: "qa" })).toMatchObject({ kind: "team", department: ptpm });
    expect(resolveNode(chart, { kind: "noTeam", departmentId: "ptpm" })).toMatchObject({ kind: "noTeam" });
    expect(resolveNode(chart, { kind: "department", id: "gone" })).toBeUndefined();
  });

  it("reads the director from the executive board", () => {
    expect(directorOf(chart)?.fullName).toBe("Giám Đốc");
    expect(directorOf({ employeeCount: 0, departments: [ptpm] })).toBeNull();
  });
});

describe("banner summaries", () => {
  it("counts departments without the executive board, every team and the units without a head", () => {
    // Team "Đảm bảo chất lượng" chưa có trưởng
    expect(chartSummary(chart)).toEqual({ departments: 1, teams: 2, vacant: 1 });
    expect(chartSummary({ employeeCount: 0, departments: [] })).toEqual({ departments: 0, teams: 0, vacant: 0 });
  });

  it("counts a missing department head but not a team lead hidden by the viewer's scope", () => {
    expect(departmentSummary({ ...ptpm, head: null })).toEqual({ teams: 2, vacant: 2 });
    const hidden = { ...ptpm, teams: [{ ...ptpm.teams[1], restricted: true, employeeCount: null }] };
    expect(departmentSummary(hidden)).toEqual({ teams: 1, vacant: 0 });
    expect(departmentSummary({ ...bgd, head: null })).toEqual({ teams: 0, vacant: 1 });
  });
});

describe("splitTeams", () => {
  const teams = Array.from({ length: 8 }, (_, index) => ({ ...ptpm.teams[0], id: `t${index}` }));

  it("keeps every team up to the limit", () => {
    expect(splitTeams(teams.slice(0, 6), 6)).toEqual({ shown: teams.slice(0, 6), more: 0 });
  });

  it("folds the rest into one row so a column has at most `max` rows", () => {
    const { shown, more } = splitTeams(teams, 6);
    expect(shown.map((team) => team.id)).toEqual(["t0", "t1", "t2", "t3", "t4"]);
    expect(more).toBe(3);
  });
});

describe("filterDepartments", () => {
  it("matches without Vietnamese accents and by code", () => {
    expect(foldText("  Đảm Bảo  ")).toBe("dam bao");
    expect(filterDepartments(chart.departments, "phat trien").map((d) => d.id)).toEqual(["ptpm"]);
    expect(filterDepartments(chart.departments, "bgd").map((d) => d.id)).toEqual(["bgd"]);
  });

  it("keeps a department with only its matching teams", () => {
    const [result] = filterDepartments(chart.departments, "dam bao");
    expect(result.id).toBe("ptpm");
    expect(result.teams.map((t) => t.id)).toEqual(["qa"]);
  });

  it("returns everything for an empty filter", () => {
    expect(filterDepartments(chart.departments, "  ")).toBe(chart.departments);
  });
});

const member = (
  id: string,
  departmentId: string,
  teamId: string | null,
  flags: Partial<Pick<OrgChartMember, "departmentHead" | "teamLead">> = {},
): OrgChartMember => ({
  id,
  employeeCode: `NV-${id}`,
  fullName: id,
  workEmail: `${id}@test.local`,
  position: null,
  office: null,
  department: { id: departmentId, code: departmentId.toUpperCase(), name: departmentId },
  team: teamId ? { id: teamId, code: teamId.toUpperCase(), name: teamId } : null,
  departmentHead: flags.departmentHead ?? false,
  teamLead: flags.teamLead ?? false,
});

describe("managerOf (same chain as the backend ManagerResolver)", () => {
  const director = directorOf(chart);

  it("goes team member → team lead → department head → director → nobody", () => {
    expect(managerOf(member("an", "ptpm", "be"), chart, director)?.id).toBe("binh");
    expect(managerOf(member("binh", "ptpm", "be", { teamLead: true }), chart, director)?.id).toBe("chi");
    expect(managerOf(member("chi", "ptpm", null, { departmentHead: true }), chart, director)?.id).toBe("gd");
    expect(managerOf(member("gd", "bgd", null, { departmentHead: true }), chart, director)).toBeNull();
  });

  it("skips vacant levels and treats executive board staff as reporting to the director", () => {
    expect(managerOf(member("em", "ptpm", "qa"), chart, director)?.id).toBe("chi");
    expect(managerOf(member("pgd", "bgd", null), chart, director)?.id).toBe("gd");
    const noHead = { ...chart, departments: [bgd, { ...ptpm, head: null }] };
    expect(managerOf(member("em", "ptpm", "qa"), noHead, director)?.id).toBe("gd");
    expect(managerOf(member("chi", "ptpm", null, { departmentHead: true }), chart, null)).toBeNull();
  });

  it("knows which unit a person leads", () => {
    expect(unitLedBy(member("chi", "ptpm", null, { departmentHead: true }))).toEqual({ kind: "department", id: "ptpm" });
    expect(unitLedBy(member("binh", "ptpm", "be", { teamLead: true }))).toEqual({ kind: "team", id: "be" });
    expect(unitLedBy(member("an", "ptpm", "be"))).toBeUndefined();
  });
});

describe("leaderRoles", () => {
  it("names the director instead of the head of the executive board", () => {
    expect(leaderRoles(member("gd", "bgd", null, { departmentHead: true }), "gd")).toEqual(["director"]);
    expect(leaderRoles(member("chi", "ptpm", null, { departmentHead: true }), "gd")).toEqual(["departmentHead"]);
  });

  it("keeps both roles of a head who also leads a team, and none for other people", () => {
    expect(leaderRoles(member("chi", "ptpm", "be", { departmentHead: true, teamLead: true }), "gd")).toEqual([
      "departmentHead",
      "teamLead",
    ]);
    expect(leaderRoles(member("binh", "ptpm", "be", { teamLead: true }), undefined)).toEqual(["teamLead"]);
    expect(leaderRoles(member("an", "ptpm", "be"), "gd")).toEqual([]);
  });
});

describe("UNIT_CODE_PATTERN", () => {
  it("matches the backend rule: 2–20 letters, digits, - or _, starting with a letter or digit", () => {
    expect(["HN", "kd-mb", "TEAM_01", "A".repeat(20)].every((code) => UNIT_CODE_PATTERN.test(code))).toBe(true);
    expect(["H", "-HN", "HÀ NỘI", "A".repeat(21), "HN 2"].some((code) => UNIT_CODE_PATTERN.test(code))).toBe(false);
  });
});
