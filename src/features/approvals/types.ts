/**
 * Kiểu dữ liệu khớp DTO của bộ máy duyệt chung (modules/approval, ApprovalDtos). Thời điểm là chuỗi ISO.
 * features/timesheet có bản rút gọn của ApprovalSummary cho trang đơn nghỉ; khi cần dùng chung thì gộp lên lib/.
 */

/** Loại yêu cầu (ApprovalType). Backend thêm loại mới mà chưa có bản dịch thì hiện nguyên mã. */
export const APPROVAL_TYPES = [
  "LEAVE",
  "LEAVE_CANCEL",
  "WFH",
  "WFH_CANCEL",
  "SHIFT_CHANGE",
  "ATTENDANCE_EXPLANATION",
  "ALLOCATION",
  "TRANSFER",
  "SALARY_ADJUSTMENT",
] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const STEP_STATUSES = ["WAITING", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const APPROVER_DECISIONS = ["PENDING", "APPROVED", "REJECTED", "NOT_REQUIRED"] as const;
export type ApproverDecision = (typeof APPROVER_DECISIONS)[number];

/** Cách tìm người duyệt của một bước: dùng để dịch tên bước (tên gốc là chữ tiếng Việt module gốc đặt). */
export const APPROVER_RULES = ["DIRECT_MANAGER", "DEPARTMENT_HEAD", "OFFICE_HR", "SPECIFIC"] as const;
export type ApproverRule = (typeof APPROVER_RULES)[number];

export type ApprovalMode = "ALL" | "ANY";

export type ApproverAssignment =
  | "RULE"
  | "ESCALATED_REQUESTER_IS_APPROVER"
  | "ESCALATED_SUBJECT_IS_APPROVER"
  | "ESCALATED_NO_APPROVER"
  | "REQUESTER_PRE_APPROVED";

export const HISTORY_ACTIONS = [
  "SUBMITTED",
  "STEP_STARTED",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
  "STEP_COMPLETED",
  "WITHDRAWN",
  "REASSIGNED",
  "COMPLETED",
] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

/** Vì sao bước đang chờ được giao lại (metadata.reason của mốc REASSIGNED). */
export const REASSIGN_REASONS = ["ACCOUNT_REVOKED", "UNIT_HEAD_CHANGED", "EMPLOYEE_UNAVAILABLE"] as const;
export type ReassignReason = (typeof REASSIGN_REASONS)[number];

/**
 * Một dòng ở danh sách (ApprovalSummary). `title`, `summary`, `currentStepName` là chữ module gốc chụp lại lúc gửi
 * (tiếng Việt), không dịch được. Tên người: null khi backend chưa trả hoặc không tìm được tài khoản.
 */
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
  requesterName?: string | null;
  requesterEmployeeId: string | null;
  /**
   * Người được đề xuất (vd nhân viên được điều chuyển / phân bổ); bằng requesterEmployeeId với đơn của chính người tạo.
   * Không bắt buộc: backend trước 1.6.1 chưa trả.
   */
  subjectEmployeeId?: string | null;
  /** Họ tên người được đề xuất, chỉ có khi đơn về người khác người tạo. */
  subjectName?: string | null;
  /** Văn phòng của người được đề xuất lúc gửi. */
  officeId?: string | null;
  submittedAt: string;
  completedAt: string | null;
};

export type ApproverResponse = {
  userId: string;
  displayName?: string | null;
  employeeId: string | null;
  decision: ApproverDecision;
  assignment: ApproverAssignment;
  comment: string | null;
  decidedAt: string | null;
};

export type StepResponse = {
  stepNo: number;
  name: string;
  rule: ApproverRule;
  mode: ApprovalMode;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  approvers: ApproverResponse[];
};

/**
 * `actorUserId` null = hệ thống (vd đẩy lên cấp trên, giao lại). metadata theo action: ESCALATED {reason, approverUserIds},
 * REASSIGNED {reason, fromUserIds, toUserIds}, APPROVED {seats} khi một người giữ nhiều ghế, COMPLETED {status}.
 */
export type HistoryResponse = {
  action: HistoryAction;
  stepNo: number | null;
  actorUserId: string | null;
  actorName?: string | null;
  comment: string | null;
  metadata: Record<string, unknown>;
  at: string;
};

export type ApprovalDetail = {
  request: ApprovalSummary;
  steps: StepResponse[];
  watcherUserIds: string[];
  timeline: HistoryResponse[];
};

/** Tab của trang /approvals: chờ tôi duyệt / tôi đã gửi / tất cả (approval:read-all). */
export const APPROVAL_TABS = ["inbox", "mine", "all"] as const;
export type ApprovalTab = (typeof APPROVAL_TABS)[number];

/** Bộ lọc trên URL. `status` không dùng ở tab inbox (inbox luôn là đơn đang chờ). */
export type ApprovalFilters = {
  tab: ApprovalTab;
  type?: ApprovalType;
  status?: ApprovalStatus;
};
