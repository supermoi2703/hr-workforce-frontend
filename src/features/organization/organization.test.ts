import { describe, expect, it } from "vitest";
import {
  decodeNode,
  directorOf,
  encodeNode,
  filterDepartments,
  foldText,
  memberFilters,
  resolveNode,
  stateFromSearchParams,
  stateToSearchParams,
} from "./rules";
import type { OrgChart, OrgChartDepartment } from "./types";

const person = (id: string, fullName: string) => ({ id, employeeCode: `NV-${id}`, fullName });

const bgd: OrgChartDepartment = {
  id: "bgd",
  code: "BGD",
  name: "Ban Giám đốc",
  executive: true,
  head: person("gd", "Giám Đốc"),
  employeeCount: 2,
  withoutTeamCount: 2,
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
  teams: [
    { id: "be", code: "BACKEND", name: "Team Backend", lead: person("binh", "Bình"), employeeCount: 6 },
    { id: "qa", code: "QA", name: "Đảm bảo chất lượng", lead: null, employeeCount: 1 },
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
