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
