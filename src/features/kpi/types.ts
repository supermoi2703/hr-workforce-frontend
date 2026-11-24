export type PeriodStatus = "OPEN" | "RATING" | "REVIEW" | "LOCKED";
export type ReviewStatus = "IN_REVIEW" | "LOCKED";

export type ReviewRow = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  status: ReviewStatus;
  onTimeScore: number | null;
  onTimeMinutes: number;
  taskMinutes: number;
  attendanceScore: number | null;
  paidUnits: number | null;
  standardDays: number | null;
  ratingScore: number | null;
  ratingProjects: number;
  ratedProjects: number;
  pmNotRated: boolean;
  machineCoefficient: number | null;
  adjustedCoefficient: number | null;
  adjustReason: string | null;
  adjustedByName: string | null;
  finalCoefficient: number | null;
  lockedAt: string | null;
  lockedByName: string | null;
  canAdjust: boolean;
  canLock: boolean;
  canUnlock: boolean;
};

export type ReviewTask = {
  taskId: string;
  taskKey: string | null;
  projectCode: string | null;
  baselineMinutes: number | null;
  noBaseline: boolean;
  baselineDueDate: string;
  completedAt: string | null;
  onTime: boolean;
};

export type ProjectRating = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  raterName: string | null;
  rating: number;
  note: string | null;
};

export type ReviewDetail = {
  review: ReviewRow;
  periodStatus: PeriodStatus;
  timesheetLocked: boolean;
  maxCoefficient: number;
  tasks: ReviewTask[];
  ratings: ProjectRating[];
};

export type TeamReviews = {
  periodStatus: PeriodStatus | null;
  timesheetLocked: boolean;
  lockDeadline: string;
  items: ReviewRow[];
};

export type MyKpi = {
  periodStatus: PeriodStatus | null;
  visible: boolean;
  lockDeadline: string;
  review: ReviewRow | null;
  tasks: ReviewTask[];
};

export type RatingTarget = {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  taskCount: number;
  doneMinutes: number;
  rating: number | null;
  note: string | null;
  locked: boolean;
};

export type RatingProject = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  total: number;
  rated: number;
  people: RatingTarget[];
};

export type MyRatings = {
  periodStatus: PeriodStatus | null;
  canRate: boolean;
  projects: RatingProject[];
};

export type RatingInput = {
  month: string;
  projectId: string;
  employeeId: string;
  rating: number;
  note: string | null;
};

export type AdjustmentInput = { coefficient: number | null; reason: string };

type Progress = { total: number; locked: number; pmNotRated: number };

export type Period = {
  month: string;
  status: PeriodStatus;
  timesheetLocked: boolean;
  payrollSubmitted: boolean;
  lockDeadline: string;
  computedAt: string | null;
  progress: Progress & { adjusted: number };
};

export type PeriodDetail = {
  period: Period;
  departments: (Progress & {
    departmentId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
  })[];
};

export type ReviewFilters = {
  officeId?: string;
  departmentId?: string;
  status?: ReviewStatus;
};

export type OfficeOption = { id: string; name: string };

export type KpiAction =
  | { type: "rate"; input: RatingInput }
  | { type: "adjust"; id: string; input: AdjustmentInput }
  | { type: "lockReview"; id: string }
  | { type: "unlockReview"; id: string; reason: string }
  | { type: "recompute"; month: string }
  | { type: "transition"; month: string; status: Exclude<PeriodStatus, "OPEN"> }
  | { type: "unlockPeriod"; month: string; reason: string };
