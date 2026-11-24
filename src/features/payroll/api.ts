import { download, http, type DownloadedFile } from "@/lib/api/http-client";
import type { PageResponse } from "@/lib/api/types";
import type {
  CalculateResponse,
  ComplaintView,
  CreatePerformanceRate,
  EmployeeOption,
  FeedbackKind,
  FeedbackStatus,
  FeedbackView,
  MyPayslip,
  MyPeriod,
  ResolveBody,
  InputCreateBody,
  MailPreview,
  MailQueued,
  MailStatusResponse,
  InputUpdateBody,
  PayrollInput,
  PayslipDetail,
  PeriodChecks,
  CheckStep,
  PayrollApprovalSummary,
  PeriodDetail,
  PeriodRow,
  PerformanceRate,
  PerformanceRatePosition,
  SheetResponse,
} from "./types";

const base = (month: string) => `/api/payroll/periods/${encodeURIComponent(month)}`;
const performanceRatesPath = "/api/payroll/performance-rates";

export const listPerformanceRates = () => http.get<PerformanceRate[]>(performanceRatesPath);

export const createPerformanceRate = (body: CreatePerformanceRate) =>
  http.post<PerformanceRate>(performanceRatesPath, body);

export const removePerformanceRate = (id: string) =>
  http.delete<void>(`${performanceRatesPath}/${encodeURIComponent(id)}`);

export const listPerformanceRatePositions = () =>
  http.get<PerformanceRatePosition[]>("/api/positions", { query: { includeInactive: true } });

export const listPeriods = (year: number) => http.get<PeriodRow[]>("/api/payroll/periods", { query: { year } });

export const getPeriod = (month: string) => http.get<PeriodDetail>(base(month));

export const openPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/open`);

export const lockPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/lock`);

export const calculatePeriod = (month: string) => http.post<CalculateResponse>(`${base(month)}/calculate`);

export const submitPeriod = (month: string, note?: string) => http.post<PeriodDetail>(`${base(month)}/submit`, { note });

export const revokeApproval = (month: string, reason: string) =>
  http.post<PeriodDetail>(`${base(month)}/revoke-approval`, { reason });

export const publishPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/publish`);

export const closePeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/close`);

export type SheetQuery = { page: number; size: number; hasWarning?: boolean; q?: string; officeId?: string; departmentId?: string; warningType?: string };

export const getSheet = (month: string, query: SheetQuery) =>
  http.get<SheetResponse>(`${base(month)}/payslips`, { query });

export const getPayslip = (month: string, employeeId: string) =>
  http.get<PayslipDetail>(`${base(month)}/payslips/${employeeId}`);

/** Tải Excel bảng lương theo cùng bộ lọc với bảng (không phân trang). */
export const exportSheet = (month: string, query: Omit<SheetQuery, "page" | "size">): Promise<DownloadedFile> =>
  download(`${base(month)}/export.xlsx`, { query });

export const getChecks = (month: string, step: CheckStep) => http.get<PeriodChecks>(`${base(month)}/checks`, { query: { step } });

export const getApprovalSummary = (month: string) => http.get<PayrollApprovalSummary>(`${base(month)}/approval-summary`);

// Dùng chung API duyệt của module approvals nhưng gọi trực tiếp (không import chéo feature).
export const approvePayroll = (approvalRequestId: string, comment: string | null) =>
  http.post<unknown>(`/api/approvals/${approvalRequestId}/approve`, { comment });

export const rejectPayroll = (approvalRequestId: string, comment: string) =>
  http.post<unknown>(`/api/approvals/${approvalRequestId}/reject`, { comment });

// ===== Khoản nhập =====

export const listInputs = (month: string, employeeId?: string, includeHistory = false) =>
  http.get<PayrollInput[]>(`${base(month)}/inputs`, { query: { employeeId, includeHistory: includeHistory || undefined } });

export const addInput = (month: string, body: InputCreateBody) => http.post<PayrollInput>(`${base(month)}/inputs`, body);

export const updateInput = (id: string, body: InputUpdateBody) => http.put<PayrollInput>(`/api/payroll/inputs/${id}`, body);

export const deleteInput = (id: string, reason: string) => http.delete<void>(`/api/payroll/inputs/${id}`, { body: { reason } });

// ===== Phiếu của tôi =====

export const listMyPeriods = () => http.get<MyPeriod[]>("/api/payroll/me/periods");

export const getMyPayslip = (month: string) => http.get<MyPayslip>(`/api/payroll/me/payslips/${encodeURIComponent(month)}`);

export const sendFeedback = (month: string, kind: FeedbackKind, note?: string) =>
  http.post<FeedbackView>(`/api/payroll/me/payslips/${encodeURIComponent(month)}/feedback`, { kind, note });

// ===== Thắc mắc =====

export type ComplaintQuery = { month: string; status?: FeedbackStatus; page: number; size: number };

export const listComplaints = (query: ComplaintQuery) =>
  http.get<PageResponse<ComplaintView>>("/api/payroll/complaints", { query });

export const resolveComplaint = (id: string, body: ResolveBody) =>
  http.post<ComplaintView>(`/api/payroll/complaints/${id}/resolve`, body);

// ===== Tìm nhân viên cho form nhập khoản (cần employee:read) =====

export const searchEmployees = (keyword: string) =>
  http.get<PageResponse<EmployeeOption>>("/api/employees", { query: { keyword, page: 0, size: 8 } });

// ===== Gửi phiếu qua mail =====

export const previewMail = (month: string, intro?: string) =>
  http.get<MailPreview>(`${base(month)}/mail/preview`, { query: { intro } });

export const sendMailToAll = (month: string, intro?: string) =>
  http.post<MailQueued>(`${base(month)}/mail`, { scope: "ALL", intro });

export const retryMail = (month: string, employeeIds?: string[]) =>
  http.post<MailQueued>(`${base(month)}/mail/retry`, { employeeIds });

export const getMailStatus = (month: string, page: number, size: number) =>
  http.get<MailStatusResponse>(`${base(month)}/mail/status`, { query: { page, size } });
