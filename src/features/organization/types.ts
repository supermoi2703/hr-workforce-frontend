// Kiểu dữ liệu khớp DTO của API cây tổ chức (backend: module organization, README mục 11).

/** Người đứng đầu đơn vị (trưởng phòng, trưởng team). */
export type OrgChartPerson = {
  id: string;
  employeeCode: string;
  fullName: string;
};

export type OrgChartTeam = {
  id: string;
  code: string;
  name: string;
  /** Trưởng team còn hợp lệ; null = chỗ trống. */
  lead: OrgChartPerson | null;
  employeeCount: number;
};

export type OrgChartDepartment = {
  id: string;
  code: string;
  name: string;
  /** true = Ban Giám đốc (trưởng là giám đốc). */
  executive: boolean;
  /** Trưởng phòng còn hợp lệ; null = chỗ trống. */
  head: OrgChartPerson | null;
  employeeCount: number;
  /** Người của phòng không thuộc team nào đang dùng. */
  withoutTeamCount: number;
  /** Như withoutTeamCount nhưng không tính trưởng phòng: số người hiện dưới ô trưởng phòng trên sơ đồ. */
  directStaffCount: number;
  teams: OrgChartTeam[];
};

/** GET /api/org-chart: Ban Giám đốc trước, còn lại theo mã. */
export type OrgChart = {
  employeeCount: number;
  departments: OrgChartDepartment[];
};

export type OrgChartOffice = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  employeeCount: number;
};

export type OrgUnitRef = {
  id: string;
  code: string;
  name: string;
};

/** Một dòng của GET /api/org-chart/members: chỉ cột danh bạ. */
export type OrgChartMember = {
  id: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  position: OrgUnitRef | null;
  office: OrgUnitRef | null;
  department: OrgUnitRef | null;
  team: OrgUnitRef | null;
  departmentHead: boolean;
  teamLead: boolean;
};

export type MemberFilters = {
  officeId?: string;
  departmentId?: string;
  teamId?: string;
  withoutTeam?: boolean;
  keyword?: string;
};

/** Hai cách xem: theo phòng ban (cả công ty) hoặc theo văn phòng. */
export type OrgView = "department" | "office";

/**
 * Nút đang chọn trên cây. `noTeam` = nhóm "trực thuộc phòng" của một phòng.
 * Trên URL: `d:<id>`, `t:<id>`, `n:<departmentId>`.
 */
export type OrgNode =
  | { kind: "department"; id: string }
  | { kind: "team"; id: string }
  | { kind: "noTeam"; departmentId: string };

/** Body POST / PUT /api/departments (backend tự viết hoa mã). */
export type DepartmentInput = { code: string; name: string; executive: boolean };

/** Body POST / PUT /api/teams; departmentId không đổi được sau khi tạo. */
export type TeamInput = { code: string; name: string; departmentId: string };
