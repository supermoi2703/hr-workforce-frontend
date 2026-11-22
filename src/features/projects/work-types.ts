import type { EmployeeOption, ProjectRole } from "./types";

export const TASK_TYPES = ["TASK", "STORY", "BUG"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const BOARD_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_STATUSES = [...BOARD_STATUSES, "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type SprintStatus = "PLANNED" | "ACTIVE" | "CLOSED";
export type RiskCode = "DUE_ON_LEAVE" | "NOT_ENOUGH_TIME" | "OVERDUE" | "LEAVE_BEFORE_DUE" | "BLOCKED" | "ASSIGNEE_UNAVAILABLE";
export type CapacityFlag = "OVERLOADED" | "ON_LEAVE" | "IDLE" | "NOT_PLANNED";

// ===== Tải tính từ task (workload bước 3, backend README module project mục 7.2)

/** Xanh ≤ 100% năng lực tuần; vàng ≤ 125% (cần thỏa thuận); đỏ trên nữa, ngày > 12 giờ, tháng vượt > 40 giờ. */
export const WORKLOAD_ZONES = ["GREEN", "YELLOW", "RED"] as const;
export type WorkloadZone = (typeof WORKLOAD_ZONES)[number];
export type ZoneReason = "WEEK_OVER_CAPACITY" | "NO_CAPACITY" | "DAY_OVER_MAX" | "MONTH_OVERTIME";

/** percent: tải ÷ năng lực; null khi không còn năng lực mà vẫn có việc. */
export type LoadWeek = { weekStart: string; capacityMinutes: number; loadMinutes: number; percent: number | null; zone: WorkloadZone };

/** Tải trong một khoảng; `weeks` rỗng ở chỗ chỉ cần tóm tắt (danh sách ứng viên). */
export type LoadSummary = {
  zone: WorkloadZone;
  reasons: ZoneReason[];
  peakWeek: LoadWeek | null;
  unscheduledMinutes: number;
  weeks: LoadWeek[];
};

export type AssignPreviewInput = {
  taskId: string | null;
  employeeId: string;
  estimateMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  sprintId: string | null;
};

/** scheduled = false: việc chưa có hạn (không trong sprint), không xét vùng. */
export type AssignPreview = { scheduled: boolean; load: LoadSummary | null };
export type TaskEventKind =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "DUE_CHANGED"
  | "START_CHANGED"
  | "ESTIMATE_CHANGED"
  | "PRIORITY_CHANGED"
  | "TITLE_CHANGED"
  | "SPRINT_CHANGED"
  | "LINK_ADDED"
  | "LINK_REMOVED"
  | "COMMENTED"
  | "WORK_LOGGED";

export type Person = { id: string; employeeCode: string | null; fullName: string };

export type TaskCard = {
  id: string;
  key: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Person | null;
  dueDate: string | null;
  estimateMinutes: number | null;
  remainingMinutes: number | null;
  loggedMinutes: number;
  sprintId: string | null;
  parentId: string | null;
  blocked: boolean;
  overdue: boolean;
  common: boolean;
  version: number;
  /** Ngày bắt đầu PM nhập; null = để trống. */
  startDate: string | null;
  workCategoryId: string | null;
  /** Ngày hiệu lực: ngày của việc, thiếu thì lấy theo sprint; cả hai null = chưa lên lịch. */
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

export type LinkedTask = { linkId: string | null; taskId: string; key: string; title: string; status: TaskStatus };

export type Task = {
  card: TaskCard;
  projectId: string;
  projectCode: string;
  description: string | null;
  reporter: Person | null;
  common: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  parent: LinkedTask | null;
  children: LinkedTask[];
  blocks: LinkedTask[];
  blockedBy: LinkedTask[];
  skillIds: string[];
  /** Kỹ năng cần kèm mức tối thiểu 1–5; null = chỉ cần có kỹ năng. */
  skills: TaskSkill[];
  workCategory: { id: string; code: string; name: string } | null;
  can: {
    edit: boolean;
    transition: boolean;
    cancel: boolean;
    delete: boolean;
    assign: boolean;
    comment: boolean;
    logWork: boolean;
  };
};

export type TaskInput = {
  type: TaskType;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  parentId: string | null;
  common?: boolean;
  sprintId?: string | null;
  dueDate: string | null;
  startDate: string | null;
  workCategoryId: string | null;
  estimateMinutes: number | null;
  skills: TaskSkillInput[];
  version?: number;
};

export type TaskSkill = { id: string; minLevel: number | null };
export type TaskSkillInput = { skillId: string; minLevel: number | null };

// ===== Nhóm công việc (workload bước 1), backend README module project mục 7.1

export const WORK_PHASES = ["ANALYSIS_DESIGN", "DEVELOPMENT", "TESTING_OPERATIONS"] as const;
export type WorkPhase = (typeof WORK_PHASES)[number];

export type WorkCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: WorkPhase;
  defaultMinutes: number;
  sortOrder: number;
  active: boolean;
  skills: { skillId: string; minLevel: number }[];
};

export type Comment = { id: string; author: Person | null; body: string; createdAt: string };
export type TaskEvent = {
  id: string;
  taskKey: string;
  actor: Person | null;
  kind: TaskEventKind;
  from: string | null;
  to: string | null;
  occurredAt: string;
};
export type Worklog = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  workDate: string;
  minutes: number;
  note: string | null;
  mine: boolean;
  createdAt: string;
};
export type WorklogInput = { workDate: string; minutes: number; note: string | null };

export type MyWork = {
  tasks: { card: TaskCard; projectId: string; projectCode: string; projectName: string }[];
  weekCapacityMinutes: number;
  weekLoadMinutes: number;
  weekZone: WorkloadZone;
};

export type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  committedMinutes: number | null;
  taskCount: number;
  doneCount: number;
  plannedMinutes: number;
  doneMinutes: number;
};
export type SprintInput = { name: string; goal: string | null; startDate: string; endDate: string };
export type SprintCapacity = {
  person: Person;
  capacityMinutes: number;
  assignedMinutes: number;
  leaveDays: number;
  overloaded: boolean;
};

export type WeekCell = {
  weekStart: string;
  capacityMinutes: number;
  loadMinutes: number;
  leaveDays: number;
  flags: CapacityFlag[];
  zone: WorkloadZone;
};
export type Capacity = {
  weeks: string[];
  /** unscheduledMinutes: giờ việc chưa lên lịch trên mọi dự án */
  people: { person: Person; weeks: WeekCell[]; unscheduledMinutes: number }[];
};

export type Risk = {
  taskId: string;
  key: string;
  title: string;
  assignee: Person | null;
  dueDate: string | null;
  remainingMinutes: number | null;
  codes: RiskCode[];
  leaveDays: string[];
  high: boolean;
};

export type Suggestion = {
  person: Person;
  freeMinutes: number;
  onLeaveOnDue: boolean;
  leaveDays: number;
  matchedSkills: number;
  requiredSkills: number;
  openTasks: number;
  enoughTime: boolean;
};

export type Overview = {
  unassigned: number;
  highPriority: number;
  overdue: number;
  blocked: number;
  risks: number;
  byStatus: Partial<Record<TaskStatus, number>>;
  byPriority: Partial<Record<TaskPriority, number>>;
  estimateMinutes: number;
  loggedMinutes: number;
  remainingMinutes: number;
  workload: { person: Person; openTasks: number; remainingMinutes: number }[];
  activeSprint: Sprint | null;
  recentEvents: TaskEvent[];
};

export type Metrics = {
  avgCycleHours: number | null;
  onTimeRate: number | null;
  estimateErrorRate: number | null;
  reassignCount: number;
  avgHoursInStatus: Partial<Record<TaskStatus, number>>;
  throughput: { weekStart: string; completed: number }[];
  sprints: { name: string; committedMinutes: number | null; doneMinutes: number }[];
};

/** load: tải trong khoảng đã hỏi, tính từ task (không kèm từng tuần); null khi chưa hỏi khoảng ngày. */
export type Candidate = { person: Person; alreadyInProject: boolean; load: LoadSummary | null };

// ===== Phân bổ có duyệt (3.4), backend README module project mục 8

export type AllocationRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type AllocationRequest = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  employee: Person;
  /** % của đề xuất gửi trước workload bước 3; null với đề xuất mới */
  percent: number | null;
  fromDate: string;
  /** null = không có ngày kết thúc */
  toDate: string | null;
  note: string | null;
  status: AllocationRequestStatus;
  requestedBy: Person | null;
  /** Đơn ở trang Phê duyệt: xem tiến độ, rút */
  approvalRequestId: string | null;
  createdAt: string;
  decidedAt: string | null;
};

/** Đưa người vào dự án: không còn % (tải tính từ task). */
export type AllocationInput = {
  employeeIds: string[];
  fromDate: string;
  toDate: string | null;
  note: string | null;
};

/** Tải của người định đề xuất trong khoảng; to: ngày cuối đã tính (không có ngày kết thúc thì 4 tuần). */
export type Availability = {
  employee: Person;
  from: string;
  to: string;
  load: LoadSummary;
};
// ===== Lịch phân bổ của một người: trang /allocations (backend README module project mục 8.6)

/** Một dòng lịch: phân bổ đã duyệt (APPROVED) hoặc đề xuất đang chờ (PENDING, có đơn ở trang Phê duyệt). */
export type PersonAllocationItem = {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectClosed: boolean;
  role: ProjectRole;
  fromDate: string;
  /** null = không có ngày kết thúc */
  toDate: string | null;
  status: AllocationRequestStatus;
  requestId: string | null;
  approvalRequestId: string | null;
};

export type PersonAllocations = {
  employee: Person;
  from: string;
  to: string;
  items: PersonAllocationItem[];
  /** Tải theo tuần tính từ task trên mọi dự án */
  load: LoadSummary;
};

/** SELF: chỉ chính mình; SCOPED: danh sách có hạn (cấp dưới, văn phòng của HR); ALL: tìm cả công ty. */
export type AllocationViewerReach = "SELF" | "SCOPED" | "ALL";

export type AllocationPeople = { reach: AllocationViewerReach; people: EmployeeOption[] };

export type OrgTeam = { id: string; code: string; name: string; departmentName: string };
export type SkillOption = { id: string; name: string; active: boolean };
