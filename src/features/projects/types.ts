// Kiểu dữ liệu khớp DTO của API dự án (backend: modules/project/README.md mục 5).

export const PROJECT_TYPES = ["TIME_AND_MATERIAL", "FIXED_PRICE", "ODC", "PRODUCT", "TRAINING", "INTERNAL"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_STATUSES = ["ACTIVE", "CLOSED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectRole = "PM" | "MEMBER" | "OBSERVER";

export type UnitRef = { id: string; code: string; name: string };
export type ProjectPerson = { id: string; employeeCode: string; fullName: string };

export type ProjectListItem = {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  billable: boolean;
  ownerDepartment: UnitRef | null;
  office: UnitRef | null;
  pm: ProjectPerson | null;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  /** Bật Backlog và Sprint; tắt là làm liên tục kiểu Kanban. */
  sprintEnabled: boolean;
  /** Số người chưa rời dự án. */
  memberCount: number;
  /** Vai trò của người đang đăng nhập; null nếu không tham gia. */
  myRole: ProjectRole | null;
};

/** Backend quyết định; frontend hiện nút theo đây, không tự suy quyền. Dự án đã đóng: mọi quyền sửa là false. */
export type ProjectPermissions = {
  editDetails: boolean;
  manageSettings: boolean;
  manageObservers: boolean;
  close: boolean;
  viewTaskContent: boolean;
  viewAllocation: boolean;
  manageMembers: boolean;
  createTask: boolean;
  editAnyTask: boolean;
  manageSprint: boolean;
  logWork: boolean;
};

export type Project = ProjectListItem & {
  /** null nếu chưa có, hoặc người xem không được xem nội dung dự án (`can.viewTaskContent`). */
  description: string | null;
  closedOn: string | null;
  can: ProjectPermissions;
  version: number;
};

export type ProjectMember = {
  employee: ProjectPerson;
  role: ProjectRole;
  /** null với người quan sát, hoặc khi người xem không được xem % của người này. */
  allocationPercent: number | null;
  fromDate: string;
  toDate: string | null;
};

export type ProjectCreateScope = { allDepartments: boolean; departmentIds: string[] };

export type ProjectFilters = {
  q?: string;
  status?: ProjectStatus;
  type?: ProjectType;
  departmentId?: string;
  officeId?: string;
  /** true = chỉ dự án mình đang hoặc sắp tham gia. */
  mine?: boolean;
};

export type CreateProjectInput = {
  code: string;
  name: string;
  description: string | null;
  type: ProjectType;
  billable: boolean;
  ownerDepartmentId: string;
  officeId: string;
  pmEmployeeId: string;
  pmAllocationPercent: number;
  startDate: string;
  endDate: string | null;
  sprintEnabled: boolean;
};

export type UpdateProjectInput = {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  version: number;
};

export type ProjectSettingsInput = {
  type: ProjectType;
  billable: boolean;
  ownerDepartmentId: string;
  officeId: string;
  version: number;
};

/** Một dòng của GET /api/org-chart/members, chỉ phần màn hình dự án cần. */
export type EmployeeOption = ProjectPerson & { position: UnitRef | null; department: UnitRef | null };
