/** Kiểu dữ liệu khớp DTO backend (modules/timesheet, modules/leave, modules/approval). */

export type DayType = "WORKING_DAY" | "WEEKLY_OFF" | "HOLIDAY";
export type ScheduleSource = "OFFICE" | "PERSONAL";
export type LeavePart = "FULL_DAY" | "MORNING" | "AFTERNOON";

export type TimesheetStatus =
  | "WORK"
  | "LATE"
  | "EARLY"
  | "LATE_EARLY"
  | "MISSING_OUT"
  | "IN_PROGRESS"
  | "ABSENT"
  | "UPCOMING"
  | "HOLIDAY"
  | "OFF"
  | "LEAVE_PAID"
  | "LEAVE_UNPAID"
  | "REMOTE";

export type EmployeeRef = { id: string; employeeCode: string | null; fullName: string | null };

/** Một ngày trên bảng công. Giờ dạng "08:30:00"; firstIn / lastOut là thời điểm ISO. */
export type TimesheetDay = {
  workDate: string;
  dayType: DayType;
  status: TimesheetStatus;
  scheduleSource: ScheduleSource;
  /** Khung phải có mặt; nghỉ nửa ngày thì là buổi còn lại. */
  scheduledStart: string;
  scheduledEnd: string;
  firstIn: string | null;
  lastOut: string | null;
  lateMinutes: number;
  earlyMinutes: number;
  workedMinutes: number;
  /** null = ngày thiếu giờ ra đang chờ HR quyết (chưa có công). */
  paidUnits: number | null;
  leavePart: LeavePart | null;
  leaveTypeCode: string | null;
  /** Buổi WFH đã duyệt, kể cả khi chưa đủ lần chấm và ngày tương lai. */
  remotePart: LeavePart | null;
  /** Có chấm cá nhân mà không có đơn WFH đã duyệt: HR rà soát. */
  outsideOffice: boolean;
};

export type TimesheetSummary = {
  paidUnits: number;
  lateCount: number;
  lateMinutes: number;
  earlyCount: number;
  earlyMinutes: number;
  absentCount: number;
  missingOutCount: number;
  leaveDays: number;
  remoteDays: number;
  outsideOfficeCount: number;
};

export type EmployeeTimesheet = { employee: EmployeeRef; days: TimesheetDay[]; summary: TimesheetSummary };

export type ShiftChangeStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type ShiftChange = {
  id: string;
  /** null = quay về giờ văn phòng. */
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  status: ShiftChangeStatus;
  effectiveFrom: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type PersonalSchedule = { startTime: string; endTime: string; effectiveFrom: string; effectiveTo: string | null };

export type MyWorkSchedule = {
  today: string;
  source: ScheduleSource;
  startTime: string;
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  upcoming: PersonalSchedule | null;
  pendingRequest: ShiftChange | null;
  history: PersonalSchedule[];
  allowedStartTimes: string[];
};

/** Mã loại nghỉ (leave_types), giao diện dịch tên theo mã. */
export type LeaveTypeCode = "ANNUAL" | "PERSONAL_PAID" | "SICK" | "UNPAID";

export type LeaveType = {
  code: LeaveTypeCode;
  name: string;
  paid: boolean;
  deductsBalance: boolean;
  noticeRequired: boolean;
  backdateAllowed: boolean;
  maxDaysPerRequest: number | null;
};

export type LeaveDraft = { leaveType: LeaveTypeCode; startDate: string; endDate: string; part: LeavePart };

export type LeavePreview = LeaveDraft & {
  days: number;
  workingDays: string[];
  shortNotice: boolean;
  minNoticeDays: number;
  onTimeDeadline: string | null;
  backdated: boolean;
  needsHrStep: boolean;
  balanceAvailable: number | null;
  balanceAfter: number | null;
  /** Mã lỗi sẽ gặp nếu gửi; null = gửi được. */
  problem: string | null;
};

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "CANCELLED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  leaveType: LeaveTypeCode;
  startDate: string;
  endDate: string;
  part: LeavePart;
  days: number;
  reason: string;
  shortNotice: boolean;
  status: LeaveRequestStatus;
  /** Trạng thái yêu cầu hủy gần nhất (đơn đã duyệt). */
  cancelStatus: ApprovalStatus | null;
  cancelReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

/** Lý do xin WFH: ba lý do đầu là chủ động (có giới hạn), còn lại là khách quan. */
export type RemoteWorkReason = "HEALTH" | "FAMILY" | "PERSONAL_TRAVEL" | "DISASTER" | "OFFICE_INCIDENT" | "WORK_REQUIRED";

export type RemoteWorkDraft = { workDate: string; part: LeavePart; reason: RemoteWorkReason };

/** Số ngày đang giữ (đơn chờ + đã duyệt) của tuần và tháng. Khách quan không có giới hạn. */
export type RemoteWorkUsage = {
  personalWeek: number;
  maxPersonalWeek: number;
  personalMonth: number;
  maxPersonalMonth: number;
  objectiveMonth: number;
};

export type RemoteWorkPreview = RemoteWorkDraft & {
  days: number;
  personal: boolean;
  shortNotice: boolean;
  minNoticeDays: number;
  usage: RemoteWorkUsage;
  /** Mã lỗi sẽ gặp nếu gửi; null = gửi được. */
  problem: string | null;
};

export type RemoteWorkRequest = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  workDate: string;
  part: LeavePart;
  reason: RemoteWorkReason;
  personal: boolean;
  detail: string;
  days: number;
  shortNotice: boolean;
  status: LeaveRequestStatus;
  cancelStatus: ApprovalStatus | null;
  cancelReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type ApprovalType =
  | "LEAVE"
  | "LEAVE_CANCEL"
  | "WFH"
  | "WFH_CANCEL"
  | "SHIFT_CHANGE"
  | "ATTENDANCE_EXPLANATION"
  | "ALLOCATION"
  | "TRANSFER"
  | "SALARY_ADJUSTMENT"
  | "OVERTIME";

/** Loại yêu cầu của cụm công & phép, hiện ở hộp "Cần tôi duyệt". */
export type TimeApprovalType = "LEAVE" | "LEAVE_CANCEL" | "WFH" | "WFH_CANCEL" | "SHIFT_CHANGE" | "OVERTIME";

export type ApprovalSummary = {
  id: string;
  type: ApprovalType;
  refId: string;
  title: string;
  summary: string | null;
  status: ApprovalStatus;
  currentStepNo: number | null;
  currentStepName: string | null;
  requesterUserId: string;
  requesterEmployeeId: string | null;
  submittedAt: string;
  completedAt: string | null;
};

export type LeaveRequestDetail = {
  request: LeaveRequest;
  approval: ApprovalSummary | null;
  cancelApproval: ApprovalSummary | null;
};

export type BalanceEntryKind = "ACCRUAL" | "HOLD" | "RELEASE" | "DEDUCT" | "REFUND" | "ADJUSTMENT";

export type LeaveBalance = {
  year: number;
  annualDays: number;
  accrued: number;
  used: number;
  held: number;
  available: number;
  entries: { kind: BalanceEntryKind; days: number; period: string | null; requestId: string | null; note: string | null; createdAt: string }[];
};

// ===== Giải trình công, HR quyết thiếu giờ ra, kỳ công =====

export type ExplanationStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

/** HR: ngày thiếu giờ ra do HR xử lý; APPROVAL: các loại khác do quản lý trực tiếp duyệt qua /api/approvals. */
export type Explanation = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  workDate: string;
  claimedIn: string | null;
  claimedOut: string | null;
  reason: string;
  attachmentFileId: string | null;
  status: ExplanationStatus;
  route: "HR" | "APPROVAL";
  approvalRequestId: string | null;
  appliedAs: string | null;
  decisionNote: string | null;
  createdAt: string;
};

export type ExplanationBody = { workDate: string; claimedIn: string | null; claimedOut: string | null; reason: string };

export type DecisionChoice = "FULL" | "HALF" | "ZERO";

export type PendingDecisionDay = {
  employeeId: string;
  employeeCode: string | null;
  fullName: string | null;
  officeId: string | null;
  workDate: string;
  firstIn: string | null;
  lateMinutes: number;
  outsideOffice: boolean;
};

export type DecisionBody = {
  employeeId: string;
  workDate: string;
  choice: DecisionChoice;
  reason: string;
  currentDecisionId?: string | null;
};

export type DecisionResult = {
  decisionId: string;
  employeeId: string;
  workDate: string;
  choice: DecisionChoice;
  paidUnits: number;
  status: TimesheetStatus;
  changed: boolean;
  needsReview: boolean;
};

export type BatchItemResult = {
  employeeId: string | null;
  workDate: string | null;
  success: boolean;
  decision: DecisionResult | null;
  errorCode: string | null;
  httpStatus: number;
  message: string | null;
};

export type PeriodStatus = "OPEN" | "LOCKED";

export type PeriodRow = {
  month: string;
  status: PeriodStatus;
  startDate: string;
  endDate: string;
  lockedAt: string | null;
  lockedByName: string | null;
  canLock: boolean;
  blockerCount: number;
};

export type LockBlocker = {
  employeeId: string;
  employeeCode: string | null;
  name: string | null;
  officeId: string | null;
  date: string;
  reason: string;
};

export type LockWarnings = {
  pendingExplanations: number;
  pendingLeaveRequests: number;
  absentUnexplained: number;
  employeesWithoutRows: number;
};

export type LockCheck = {
  month: string;
  status: PeriodStatus;
  canLock: boolean;
  scope: "COMPANY" | "OFFICE";
  blockers: LockBlocker[];
  blockerTotal: number;
  warnings: LockWarnings;
};

export type LockResult = {
  month: string;
  status: PeriodStatus;
  lockedAt: string | null;
  lockedBy: string | null;
  summary: { employees: number; days: number; changedDays: number; warnings: LockWarnings } | null;
  warnings: LockWarnings | null;
  alreadyLocked: boolean;
};

export type LateChange = {
  id: string;
  employeeId: string;
  workDate: string;
  month: string;
  source: "EXPLANATION_APPROVED" | "LEAVE_APPROVED" | "WFH_APPROVED" | "OVERTIME_APPROVED" | "INCIDENT" | "HR_REQUEST";
  refType: string | null;
  refId: string | null;
  proposedPaidUnits: number | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  consumedPayrollPeriod: string | null;
};
