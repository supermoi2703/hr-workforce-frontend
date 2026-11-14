// Khớp DashboardDtos của backend (module dashboard). Quy ước: số null = "chưa có dữ liệu" (nguồn của module khác chưa có),
// khác với 0. Ngày dạng yyyy-MM-dd, tháng dạng yyyy-MM.

export type DashboardBlock = "ME" | "TEAM" | "HR" | "RESOURCES";

export type UnitRef = { id: string; code: string; name: string };

export type PersonRef = {
  id: string;
  employeeCode: string;
  fullName: string;
  department: UnitRef | null;
  office: UnitRef | null;
};

// ===== Nguồn lực =====

export type ResourceSummary = {
  people: number;
  plannedPercent: number;
  actualPercent: number | null;
  billablePercent: number;
  benchCount: number;
  overloadedCount: number;
};

export type WeekPoint = { weekStart: string; plannedPercent: number; benchCount: number };

export type DepartmentLoad = {
  department: UnitRef | null;
  people: number;
  plannedPercent: number;
  actualPercent: number | null;
  /** Cùng thứ tự với `ResourceDashboard.weeks`; null = tuần không có ngày làm việc. */
  weeks: (number | null)[];
};

export type UtilizationBucket = "0" | "1-50" | "51-80" | "81-100" | "over-100";

export type Bucket = { key: UtilizationBucket; count: number };

export type BenchPerson = { person: PersonRef; skills: string[] };

export type WeekLoad = { weekStart: string; capacityMinutes: number; loadMinutes: number };

export type OverloadedPerson = {
  person: PersonRef;
  maxDailyPercent: number;
  /** Ngày đầu tiên tổng % vượt trần; null = chỉ quá tải việc. */
  firstOverDay: string | null;
  overCapacityWeeks: WeekLoad[];
};

/** Một dự án trong khoảng xem; `fte` = tổng thời gian quy ra người làm toàn thời gian. */
export type ProjectLoad = { projectId: string; code: string; name: string; billable: boolean; people: number; fte: number };

export type ResourceDashboard = {
  from: string;
  to: string;
  limitPercent: number;
  summary: ResourceSummary;
  weeks: string[];
  trend: WeekPoint[];
  departments: DepartmentLoad[];
  distribution: Bucket[];
  bench: BenchPerson[];
  overloaded: OverloadedPerson[];
  projects: ProjectLoad[];
};

export type PersonUtilization = {
  person: PersonRef;
  plannedPercent: number;
  actualPercent: number | null;
  billablePercent: number;
  maxDailyPercent: number;
  bench: boolean;
  overAllocated: boolean;
  overCapacity: boolean;
};

// ===== Đội =====

export type LeavePart = "FULL_DAY" | "MORNING" | "AFTERNOON";

export type AwayDay = { date: string; kind: "LEAVE" | "REMOTE"; part: LeavePart };

export type AwayPerson = { person: PersonRef; days: AwayDay[] };

/** Đi muộn của đội từ `from` (ngày 1 tháng này) tới hôm nay. */
export type TeamLateness = { from: string; ratePercent: number; lateCount: number; latePeople: number };

export type TeamDashboard = {
  people: number;
  pendingApprovals: number;
  weekStart: string;
  awayThisWeek: AwayPerson[];
  plannedPercent: number;
  members: PersonUtilization[];
  /** null = trong tháng chưa có ngày đi làm nào trên bảng công. */
  lateness: TeamLateness | null;
};

// ===== HR =====

export type MonthPoint = { month: string; hires: number; terminations: number; headcount: number };

export type DepartmentCount = { department: UnitRef | null; headcount: number };

export type ExpiringContract = { person: PersonRef; contractNumber: string; type: string; endDate: string };

export type ContractsExpiring = {
  within30Days: number;
  within60Days: number;
  items: ExpiringContract[];
  weeks: { weekStart: string; count: number }[];
};

/**
 * Chấm công hôm nay tính tới `asOf`. `expected = present + remote + notCheckedIn`; `late` nằm trong số đã chấm;
 * `onLeave` (nghỉ cả ngày có đơn, nghỉ dài hạn) không tính vào `expected`.
 */
export type AttendanceToday = {
  asOf: string;
  expected: number;
  present: number;
  remote: number;
  late: number;
  onLeave: number;
  notCheckedIn: number;
};

/** Một phần của cơ cấu: `key` là mã nhóm (dịch ở FE) hoặc id văn phòng (kèm `label`). */
export type Slice = { key: string; label: string | null; count: number };

export type HrDashboard = {
  headcount: number;
  onboarding: number;
  hires12Months: number;
  terminations12Months: number;
  turnoverPercent: number;
  months: MonthPoint[];
  departments: DepartmentCount[];
  /** null = không có quyền xem hợp đồng. */
  contracts: ContractsExpiring | null;
  /** null = hôm nay không ai phải làm. */
  attendanceToday: AttendanceToday | null;
  payroll: { month: string; amount: number }[] | null;
  byEmploymentType: Slice[];
  byTenure: Slice[];
  byLevel: Slice[];
  byOffice: Slice[];
};

// ===== Của tôi =====

export type MyProject = { projectId: string; code: string; name: string | null; role: "PM" | "MEMBER"; percent: number };

export type MyDashboard = {
  pendingRequests: number;
  /** null = tài khoản chưa gắn hồ sơ nhân viên. */
  leave: { year: number; annualDays: number; used: number; available: number } | null;
  projects: MyProject[];
  allocatedPercent: number;
  today: { status: string; firstIn: string | null; lastOut: string | null; lateMinutes: number } | null;
  payslip: { month: string; netAmount: number } | null;
};

// ===== Bộ lọc (trên URL) =====

export const RANGE_WEEKS = [4, 8, 12, 26] as const;
export type RangeWeeks = (typeof RANGE_WEEKS)[number];

export const DASHBOARD_TABS = ["overview", "resources", "hr", "team", "me"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export type DashboardFilters = {
  /** Tab đang mở; undefined = tab mặc định theo quyền. */
  tab?: DashboardTab;
  officeId?: string;
  departmentId?: string;
  /** Số tuần tính từ thứ Hai tuần này (khối Nguồn lực). */
  weeks: RangeWeeks;
};
