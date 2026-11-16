// Kiểu dữ liệu khớp PayrollDtos của backend. Tháng là chuỗi "yyyy-MM"; số tiền là number; thời điểm là ISO string.
// Tổng quỹ (grossTotal, netTotal, totalGross, totalNet) là null khi người gọi không có phạm vi toàn công ty.

export type PayrollPeriodStatus = "OPEN" | "LOCKED" | "CALCULATED" | "APPROVED" | "PUBLISHED" | "CLOSED";

/** Gợi ý thao tác backend trả về cho trạng thái hiện tại của kỳ. */
export type PayrollAction = "LOCK" | "CALCULATE" | "SUBMIT" | "PUBLISH" | "REVOKE_APPROVAL" | "CLOSE";

export type PeriodRow = {
  month: string;
  status: PayrollPeriodStatus;
  employees: number;
  grossTotal: number | null;
  netTotal: number | null;
  publishedAt: string | null;
  complaintDeadline: string | null;
};

export type StatusLogEntry = {
  from: PayrollPeriodStatus | null;
  to: PayrollPeriodStatus;
  actorUserId: string | null;
  reason: string | null;
  at: string;
};

export type PeriodDetail = {
  month: string;
  status: PayrollPeriodStatus;
  startDate: string;
  endDate: string;
  lockedAt: string | null;
  lockedBy: string | null;
  calculatedAt: string | null;
  calculatedBy: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  approvalRequestId: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  complaintDeadline: string | null;
  closedAt: string | null;
  closedBy: string | null;
  pendingApproval: boolean;
  employees: number;
  statusLog: StatusLogEntry[];
  nextActions: string[];
};

export type CalculateResponse = {
  month: string;
  status: PayrollPeriodStatus;
  payslips: number;
  warnings: number;
  errors: number;
  skippedWithoutContract: number;
  totalGross: number | null;
  totalNet: number | null;
};

export type PayslipRow = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string | null;
  contractType: string | null;
  /** Công thực tế (paidDays). */
  w: number;
  /** Công chuẩn (standardDays). */
  n: number;
  blockA: number;
  blockB: number;
  adjust: number;
  gross: number;
  si: number;
  pit: number;
  net: number;
  nonDeductible: boolean;
  warnings: string[];
};

export type SheetTotals = {
  lines: number;
  gross: number | null;
  si: number | null;
  pit: number | null;
  net: number | null;
};

export type SheetResponse = {
  payslips: import("@/lib/api/types").PageResponse<PayslipRow>;
  totals: SheetTotals;
};

export type PayslipLineView = {
  code: string;
  name: string;
  group: string;
  baseAmount: number | null;
  rate: number | null;
  amount: number;
  explanation: string | null;
};

export type PayslipDetail = {
  month: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string | null;
  contractType: string | null;
  standardDays: number;
  paidDays: number;
  baseSalary: number;
  lunchAllowance: number;
  otherAllowance: number;
  performanceSalary: number;
  insuranceSalary: number;
  dependents: number;
  kpiCoefficient: number | null;
  otHoursNormal: number;
  otHoursWeeklyOff: number;
  otHoursHoliday: number;
  blockA: number;
  blockB: number;
  adjust: number;
  gross: number;
  si: number;
  taxableIncome: number;
  assessableIncome: number;
  pit: number;
  net: number;
  nonDeductible: boolean;
  warnings: string[];
  calculatedAt: string | null;
  lines: PayslipLineView[];
};

export type SheetFilters = {
  hasWarning: boolean;
  q: string;
};

// ===== Khoản nhập (PayrollInputDtos) =====

export type PayrollInputCode =
  | "BONUS"
  | "KPI_BONUS"
  | "ADJUST"
  | "OT_HOURS_NORMAL"
  | "OT_HOURS_WEEKLY_OFF"
  | "OT_HOURS_HOLIDAY"
  | "KPI_COEFFICIENT";

/** Một dòng khoản nhập. `current` false: dòng đã bị thay (supersededBy) hoặc xóa mềm (deletedAt). */
export type PayrollInput = {
  id: string;
  month: string;
  employeeId: string;
  code: PayrollInputCode;
  amount: number | null;
  quantity: number | null;
  adjustSourceMonth: string | null;
  reason: string;
  current: boolean;
  supersededBy: string | null;
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
};

export type InputCreateBody = {
  employeeId: string;
  code: PayrollInputCode;
  amount?: number;
  quantity?: number;
  adjustSourceMonth?: string;
  reason: string;
};

export type InputUpdateBody = {
  amount?: number;
  quantity?: number;
  adjustSourceMonth?: string;
  reason: string;
};

// ===== Phiếu của tôi, phản hồi, thắc mắc =====

export type FeedbackKind = "CONFIRM" | "DISPUTE";
export type FeedbackStatus = "OPEN" | "RESOLVED";
export type FeedbackDecision = "ACCEPTED" | "REJECTED";
export type PayslipAckStatus = "PENDING" | "CONFIRMED" | "DISPUTED";

export type MyPeriod = {
  month: string;
  status: PayrollPeriodStatus;
  publishedAt: string | null;
  complaintDeadline: string | null;
  ackStatus: PayslipAckStatus;
};

export type FeedbackView = {
  kind: FeedbackKind;
  note: string | null;
  status: FeedbackStatus;
  decision: FeedbackDecision | null;
  decisionReason: string | null;
  handledAt: string | null;
};

export type MyPayslip = {
  payslip: PayslipDetail;
  periodStatus: PayrollPeriodStatus;
  complaintDeadline: string | null;
  ackStatus: PayslipAckStatus;
  feedback: FeedbackView | null;
  canRespond: boolean;
};

export type ComplaintView = {
  id: string;
  month: string;
  employeeId: string;
  employeeCode: string | null;
  fullName: string | null;
  note: string | null;
  createdAt: string;
  status: FeedbackStatus;
  decision: FeedbackDecision | null;
  decisionReason: string | null;
  handledAt: string | null;
  adjustInputId: string | null;
};

export type ResolveBody = {
  decision: FeedbackDecision;
  reason: string;
  adjustAmount?: number;
  targetMonth?: string;
};

/** Một dòng trong ô chọn nhân viên (GET /api/employees). */
export type EmployeeOption = { id: string; employeeCode: string; fullName: string };

// ===== Gửi phiếu qua mail (PayrollMailDtos); mail chỉ là thông báo, không có số tiền =====

export type MailStatus = "PENDING" | "SENT" | "FAILED";

export type MailPreview = { subject: string; body: string };

export type MailQueued = { queued: number };

export type MailStatusRow = {
  employeeId: string;
  employeeCode: string | null;
  fullName: string | null;
  maskedEmail: string | null;
  status: MailStatus;
  error: string | null;
  attempts: number;
  sentAt: string | null;
};

export type MailStatusResponse = {
  rows: import("@/lib/api/types").PageResponse<MailStatusRow>;
  counts: Partial<Record<MailStatus, number>>;
};
