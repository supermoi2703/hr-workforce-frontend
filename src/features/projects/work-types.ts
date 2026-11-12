export const TASK_TYPES = ["TASK", "STORY", "BUG"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const BOARD_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_STATUSES = [...BOARD_STATUSES, "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type SprintStatus = "PLANNED" | "ACTIVE" | "CLOSED";
export type RiskCode = "DUE_ON_LEAVE" | "NOT_ENOUGH_TIME" | "OVERDUE" | "LEAVE_BEFORE_DUE" | "BLOCKED" | "ASSIGNEE_UNAVAILABLE";
export type CapacityFlag = "OVERLOADED" | "ON_LEAVE" | "IDLE";
export type TaskEventKind =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "DUE_CHANGED"
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
  estimateMinutes: number | null;
  skillIds: string[];
  version?: number;
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
};
export type Capacity = {
  weeks: string[];
  people: { person: Person; allocationPercent: number; weeks: WeekCell[] }[];
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

/** freePercent: % còn trống ít nhất trong khoảng đã hỏi (đã trừ đề xuất đang chờ, không tính dự án này); null khi chưa hỏi. */
export type Candidate = { person: Person; alreadyInProject: boolean; freePercent: number | null };

// ===== Phân bổ có duyệt (3.4), backend README module project mục 8

export type AllocationRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type AllocationRequest = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  employee: Person;
  percent: number;
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

export type AllocationInput = {
  employeeIds: string[];
  percent: number;
  fromDate: string;
  toDate: string | null;
  note: string | null;
};

export type AllocationSegment = {
  from: string;
  to: string | null;
  approvedPercent: number;
  heldPercent: number;
  freePercent: number;
};

export type Availability = {
  employee: Person;
  from: string;
  to: string | null;
  /** Mức tối đa đề xuất được trong cả khoảng */
  freePercent: number;
  segments: AllocationSegment[];
};
export type OrgTeam = { id: string; code: string; name: string; departmentName: string };
export type SkillOption = { id: string; name: string; active: boolean };
