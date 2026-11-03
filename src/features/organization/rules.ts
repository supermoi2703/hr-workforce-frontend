import type { MemberFilters, OrgChart, OrgChartDepartment, OrgChartTeam, OrgNode, OrgView } from "./types";

/** Trạng thái trang nằm trên URL (gửi link / F5 vẫn giữ). */
export type OrgPageState = {
  view: OrgView;
  /** Văn phòng đang xem (chỉ dùng khi view = "office"). */
  officeId?: string;
  node?: OrgNode;
  /** Tìm người theo tên hoặc mã. */
  keyword?: string;
};

export function encodeNode(node: OrgNode): string {
  switch (node.kind) {
    case "department":
      return `d:${node.id}`;
    case "team":
      return `t:${node.id}`;
    case "noTeam":
      return `n:${node.departmentId}`;
  }
}

export function decodeNode(value: string | null | undefined): OrgNode | undefined {
  const match = /^([dtn]):(.+)$/.exec(value ?? "");
  if (!match) return undefined;
  const [, kind, id] = match;
  if (kind === "d") return { kind: "department", id };
  if (kind === "t") return { kind: "team", id };
  return { kind: "noTeam", departmentId: id };
}

export function sameNode(a: OrgNode | undefined, b: OrgNode | undefined): boolean {
  return !!a && !!b && encodeNode(a) === encodeNode(b);
}

export function stateFromSearchParams(params: URLSearchParams): OrgPageState {
  const view: OrgView = params.get("view") === "office" ? "office" : "department";
  return {
    view,
    officeId: view === "office" ? params.get("office") || undefined : undefined,
    node: decodeNode(params.get("node")),
    keyword: params.get("q")?.trim() || undefined,
  };
}

export function stateToSearchParams(state: OrgPageState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.view === "office") {
    params.set("view", "office");
    if (state.officeId) params.set("office", state.officeId);
  }
  if (state.node) params.set("node", encodeNode(state.node));
  if (state.keyword) params.set("q", state.keyword);
  return params;
}

/** Bộ lọc gửi /members cho nút đang chọn; đang xem theo văn phòng thì thêm officeId. */
export function memberFilters(state: OrgPageState): MemberFilters {
  const officeId = state.view === "office" ? state.officeId : undefined;
  if (state.keyword) return { officeId, keyword: state.keyword };
  switch (state.node?.kind) {
    case "department":
      return { officeId, departmentId: state.node.id };
    case "team":
      return { officeId, teamId: state.node.id };
    case "noTeam":
      return { officeId, departmentId: state.node.departmentId, withoutTeam: true };
    default:
      return { officeId };
  }
}

export type ResolvedNode =
  | { kind: "department"; department: OrgChartDepartment }
  | { kind: "team"; department: OrgChartDepartment; team: OrgChartTeam }
  | { kind: "noTeam"; department: OrgChartDepartment };

/** Tìm nút trên cây đang tải; không còn (đơn vị đã ngừng dùng, không có ai ở văn phòng này) thì undefined. */
export function resolveNode(chart: OrgChart | undefined, node: OrgNode | undefined): ResolvedNode | undefined {
  if (!chart || !node) return undefined;
  for (const department of chart.departments) {
    if (node.kind === "department" && department.id === node.id) return { kind: "department", department };
    if (node.kind === "noTeam" && department.id === node.departmentId) return { kind: "noTeam", department };
    if (node.kind === "team") {
      const team = department.teams.find((t) => t.id === node.id);
      if (team) return { kind: "team", department, team };
    }
  }
  return undefined;
}

/** Giám đốc: trưởng Ban Giám đốc, null nếu chưa có. */
export function directorOf(chart: OrgChart | undefined) {
  return chart?.departments.find((d) => d.executive)?.head ?? null;
}

/** Bỏ dấu tiếng Việt và viết thường, để gõ "phat trien" vẫn tìm ra "Phát triển". */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Lọc cây theo tên hoặc mã đơn vị. Phòng khớp thì giữ cả các team; chỉ team khớp thì giữ phòng cha với các team khớp.
 */
export function filterDepartments(departments: OrgChartDepartment[], text: string): OrgChartDepartment[] {
  const needle = foldText(text);
  if (!needle) return departments;
  const matches = (unit: { code: string; name: string }) =>
    foldText(unit.name).includes(needle) || foldText(unit.code).includes(needle);
  return departments.flatMap((department) => {
    if (matches(department)) return [department];
    const teams = department.teams.filter(matches);
    return teams.length > 0 ? [{ ...department, teams }] : [];
  });
}

/** Số người ở nút đang chọn, để hiện ngay trên tiêu đề trước khi danh sách tải xong. */
export function nodeCount(resolved: ResolvedNode): number {
  switch (resolved.kind) {
    case "department":
      return resolved.department.employeeCount;
    case "team":
      return resolved.team.employeeCount;
    case "noTeam":
      return resolved.department.withoutTeamCount;
  }
}
