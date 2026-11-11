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
  /** Trưởng team còn hợp lệ; null = chỗ trống (hoặc bị ẩn nếu restricted). */
  lead: OrgChartPerson | null;
  /** null khi restricted. */
  employeeCount: number | null;
  /** true = người xem không thấy hết người của team (ngoài phạm vi): không có trưởng team, không có số người. */
  restricted: boolean;
};

export type OrgChartDepartment = {
  id: string;
  code: string;
  name: string;
  /** true = Ban Giám đốc (trưởng là giám đốc). */
  executive: boolean;
  /** Trưởng phòng còn hợp lệ; null = chỗ trống. */
  head: OrgChartPerson | null;
  /** Các số người là null khi restricted. */
  employeeCount: number | null;
  /** Người của phòng không thuộc team nào đang dùng. */
  withoutTeamCount: number | null;
  /** Như withoutTeamCount nhưng không tính trưởng phòng: số người hiện dưới ô trưởng phòng trên sơ đồ. */
  directStaffCount: number | null;
  /** true = người xem không thấy hết người của phòng (ngoài phạm vi): danh sách chỉ có trưởng phòng. */
  restricted: boolean;
  teams: OrgChartTeam[];
};

/** GET /api/org-chart: Ban Giám đốc trước, còn lại theo mã. */
export type OrgChart = {
  /** null khi người xem không thấy hết. */
  employeeCount: number | null;
  departments: OrgChartDepartment[];
};

export type OrgChartOffice = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  /** null khi người xem không thấy hết người ở văn phòng. */
  employeeCount: number | null;
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
