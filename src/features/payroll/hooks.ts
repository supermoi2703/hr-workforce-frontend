"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  approvePayroll,
  exportSheet,
  getApprovalSummary,
  getChecks,
  rejectPayroll,
  calculatePeriod,
  closePeriod,
  addInput,
  createPerformanceRate,
  deleteInput,
  getMailStatus,
  getMyPayslip,
  previewMail,
  retryMail,
  sendMailToAll,
  getPayslip,
  listComplaints,
  listMyPeriods,
  listPerformanceRates,
  listPerformanceRatePositions,
  removePerformanceRate,
  resolveComplaint,
  searchEmployees,
  sendFeedback,
  type ComplaintQuery,
  listInputs,
  updateInput,
  getPeriod,
  getSheet,
  listPeriods,
  lockPeriod,
  openPeriod,
  publishPeriod,
  revokeApproval,
  submitPeriod,
  type SheetQuery,
} from "./api";
import { mailRefetchInterval } from "./mail";
import type { CheckStep, FeedbackKind, InputCreateBody, InputUpdateBody, ResolveBody } from "./types";

export const payrollKeys = {
  all: ["payroll"] as const,
  performanceRates: ["payroll", "performance-rates"] as const,
  performanceRatePositions: ["payroll", "performance-rate-positions"] as const,
  periods: (year: number) => ["payroll", "periods", year] as const,
  period: (month: string) => ["payroll", "period", month] as const,
  sheet: (month: string, query: SheetQuery) => ["payroll", "sheet", month, query] as const,
  inputs: (month: string, employeeId: string | undefined, history: boolean) =>
    ["payroll", "inputs", month, employeeId ?? "", history] as const,
  mailStatus: (month: string, page: number, size: number) => ["payroll", "mail", month, page, size] as const,
  myPeriods: ["payroll", "me", "periods"] as const,
  myPayslip: (month: string) => ["payroll", "me", "payslip", month] as const,
  complaints: (query: ComplaintQuery) => ["payroll", "complaints", query] as const,
  employees: (keyword: string) => ["payroll", "employees", keyword] as const,
  checks: (month: string, step: CheckStep) => ["payroll", "checks", month, step] as const,
  approvalSummary: (month: string) => ["payroll", "approval-summary", month] as const,
  payslip: (month: string, employeeId: string) => ["payroll", "payslip", month, employeeId] as const,
};

export const usePerformanceRates = () =>
  useQuery({ queryKey: payrollKeys.performanceRates, queryFn: listPerformanceRates });

export const usePerformanceRatePositions = () =>
  useQuery({ queryKey: payrollKeys.performanceRatePositions, queryFn: listPerformanceRatePositions });

export function useCreatePerformanceRate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPerformanceRate,
    onSuccess: () => client.invalidateQueries({ queryKey: payrollKeys.performanceRates }),
  });
}

export function useRemovePerformanceRate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: removePerformanceRate,
    onSettled: () => client.invalidateQueries({ queryKey: payrollKeys.performanceRates }),
  });
}

export const usePeriods = (year: number) =>
  useQuery({ queryKey: payrollKeys.periods(year), queryFn: () => listPeriods(year) });

export const usePeriod = (month: string) =>
  useQuery({ queryKey: payrollKeys.period(month), queryFn: () => getPeriod(month) });

export const useSheet = (month: string, query: SheetQuery, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.sheet(month, query),
    queryFn: () => getSheet(month, query),
    placeholderData: keepPreviousData,
    enabled,
  });

export const usePayslip = (month: string, employeeId: string | null) =>
  useQuery({
    queryKey: payrollKeys.payslip(month, employeeId ?? ""),
    queryFn: () => getPayslip(month, employeeId as string),
    enabled: !!employeeId,
  });

/** Hộp kiểm tra trước thao tác; lỗi (backend cũ chưa có) thì coi như không có hộp, không chặn nút. */
export const useChecks = (month: string, step: CheckStep, enabled: boolean) =>
  useQuery({
    queryKey: payrollKeys.checks(month, step),
    queryFn: () => getChecks(month, step),
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

export const useApprovalSummary = (month: string) =>
  useQuery({ queryKey: payrollKeys.approvalSummary(month), queryFn: () => getApprovalSummary(month) });

export const useExportSheet = (month: string) =>
  useMutation({ mutationFn: (query: Omit<SheetQuery, "page" | "size">) => exportSheet(month, query) });

export function useDecidePayroll() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: "approve" | "reject"; comment: string }) =>
      decision === "approve" ? approvePayroll(id, comment || null) : rejectPayroll(id, comment),
    onSuccess: invalidate,
  });
}

export const useInputs = (month: string, employeeId?: string, includeHistory = false, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.inputs(month, employeeId, includeHistory),
    queryFn: () => listInputs(month, employeeId, includeHistory),
    enabled,
  });

export const useMyPeriods = () => useQuery({ queryKey: payrollKeys.myPeriods, queryFn: listMyPeriods });

export const useMyPayslip = (month: string | null) =>
  useQuery({ queryKey: payrollKeys.myPayslip(month ?? ""), queryFn: () => getMyPayslip(month as string), enabled: !!month });

export const useComplaints = (query: ComplaintQuery, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.complaints(query),
    queryFn: () => listComplaints(query),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Gợi ý nhân viên theo từ khóa (đã debounce ở nơi gọi); chỉ gọi khi đủ dài. */
export const useEmployeeSearch = (keyword: string, enabled: boolean) =>
  useQuery({
    queryKey: payrollKeys.employees(keyword),
    queryFn: () => searchEmployees(keyword),
    enabled: enabled && keyword.length >= 2,
    staleTime: 30_000,
  });

/** Mọi thao tác làm đổi trạng thái kỳ hoặc bảng lương: làm mới danh sách, chi tiết kỳ và bảng lương. */
function useInvalidate() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: payrollKeys.all }), [client]);
}

export function useOpenPeriod() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (month: string) => openPeriod(month), onSuccess: invalidate });
}

export function useLockPeriod(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => lockPeriod(month), onSuccess: invalidate });
}

export function useCalculatePeriod(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => calculatePeriod(month), onSuccess: invalidate });
}

export function useSubmitPeriod(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (note?: string) => submitPeriod(month, note), onSuccess: invalidate });
}

export function useRevokeApproval(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (reason: string) => revokeApproval(month, reason), onSuccess: invalidate });
}

export function usePublishPeriod(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => publishPeriod(month), onSuccess: invalidate });
}

export function useClosePeriod(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => closePeriod(month), onSuccess: invalidate });
}

export function useAddInput(month: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: InputCreateBody) => addInput(month, body), onSuccess: invalidate });
}

export function useUpdateInput() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InputUpdateBody }) => updateInput(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteInput() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteInput(id, reason),
    onSuccess: invalidate,
  });
}

/** Trạng thái mail từng người; tự làm mới mỗi 5 giây khi còn PENDING. */
export const useMailStatus = (month: string, page: number, size: number, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.mailStatus(month, page, size),
    queryFn: () => getMailStatus(month, page, size),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: (query) => mailRefetchInterval(query.state.data?.counts),
  });

export const usePreviewMail = (month: string) => useMutation({ mutationFn: (intro?: string) => previewMail(month, intro) });

export function useSendMail(month: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (intro?: string) => sendMailToAll(month, intro),
    onSuccess: () => client.invalidateQueries({ queryKey: ["payroll", "mail", month] }),
  });
}

export function useRetryMail(month: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds?: string[]) => retryMail(month, employeeIds),
    onSuccess: () => client.invalidateQueries({ queryKey: ["payroll", "mail", month] }),
  });
}

export function useSendFeedback(month: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ kind, note }: { kind: FeedbackKind; note?: string }) => sendFeedback(month, kind, note),
    onSuccess: invalidate,
  });
}

export function useResolveComplaint() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveBody }) => resolveComplaint(id, body),
    onSuccess: invalidate,
  });
}

type ErrorKey = keyof Messages["Payroll"]["errors"];

// Mã lỗi backend của module lương → key trong messages (Payroll.errors.*).
const ERROR_KEYS: Record<string, ErrorKey> = {
  PAYROLL_INVALID_TRANSITION: "invalidTransition",
  PERIOD_NOT_LOCKED: "periodNotLocked",
  PAYROLL_CALC_IN_PROGRESS: "calcInProgress",
  PAYROLL_PERIOD_LOCKED_FOR_INPUT: "lockedForInput",
  PAYROLL_NO_APPROVER: "noApprover",
  PAYROLL_RECALC_REQUIRED: "recalcRequired",
  PAYROLL_CALC_HAS_ERRORS: "calcHasErrors",
  PAYROLL_CLOSE_BLOCKED: "closeBlocked",
  PAYROLL_PERIOD_EXISTS: "periodExists",
  PAYROLL_PERIOD_NOT_FOUND: "periodNotFound",
  PAYSLIP_NOT_FOUND: "payslipNotFound",
  PERIOD_NOT_PUBLISHED: "periodNotPublished",
  PERIOD_NOT_ENDED: "periodNotEnded",
  PAYROLL_INPUT_EXISTS: "inputExists",
  PAYROLL_INPUT_NOT_FOUND: "inputNotFound",
  REASON_REQUIRED: "reasonRequired",
  FEEDBACK_EXPIRED: "feedbackExpired",
  FEEDBACK_ALREADY_SENT: "feedbackAlreadySent",
  COMPLAINT_NOT_FOUND: "complaintNotFound",
  COMPLAINT_ALREADY_RESOLVED: "complaintAlreadyResolved",
  PAYROLL_SHEET_EMPTY: "sheetEmpty",
  RATE_ALREADY_EXISTS: "rateAlreadyExists",
  RATE_NOT_FOUND: "rateNotFound",
  RATE_IN_USE: "rateInUse",
  FORBIDDEN: "forbidden",
};

/** Lỗi API của module lương thành câu dễ hiểu; mã khác dùng câu chung. */
export function usePayrollErrorMessage() {
  const t = useTranslations("Payroll.errors");
  const generic = useErrorMessage();
  return useCallback(
    (error: unknown) => {
      const key = isApiError(error) ? ERROR_KEYS[error.code] : undefined;
      return key ? t(key) : generic(error);
    },
    [t, generic],
  );
}
