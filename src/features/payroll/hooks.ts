"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  calculatePeriod,
  closePeriod,
  addInput,
  deleteInput,
  getMyPayslip,
  getPayslip,
  listComplaints,
  listMyPeriods,
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
import type { FeedbackKind, InputCreateBody, InputUpdateBody, ResolveBody } from "./types";

export const payrollKeys = {
  all: ["payroll"] as const,
  periods: (year: number) => ["payroll", "periods", year] as const,
  period: (month: string) => ["payroll", "period", month] as const,
  sheet: (month: string, query: SheetQuery) => ["payroll", "sheet", month, query] as const,
  inputs: (month: string, employeeId: string | undefined, history: boolean) =>
    ["payroll", "inputs", month, employeeId ?? "", history] as const,
  myPeriods: ["payroll", "me", "periods"] as const,
  myPayslip: (month: string) => ["payroll", "me", "payslip", month] as const,
  complaints: (query: ComplaintQuery) => ["payroll", "complaints", query] as const,
  employees: (keyword: string) => ["payroll", "employees", keyword] as const,
  payslip: (month: string, employeeId: string) => ["payroll", "payslip", month, employeeId] as const,
};

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
  PAYROLL_CLOSE_BLOCKED: "closeBlocked",
  PAYROLL_PERIOD_EXISTS: "periodExists",
  PAYROLL_PERIOD_NOT_FOUND: "periodNotFound",
  PAYSLIP_NOT_FOUND: "payslipNotFound",
  PERIOD_NOT_ENDED: "periodNotEnded",
  PAYROLL_INPUT_EXISTS: "inputExists",
  PAYROLL_INPUT_NOT_FOUND: "inputNotFound",
  REASON_REQUIRED: "reasonRequired",
  FEEDBACK_EXPIRED: "feedbackExpired",
  FEEDBACK_ALREADY_SENT: "feedbackAlreadySent",
  COMPLAINT_NOT_FOUND: "complaintNotFound",
  COMPLAINT_ALREADY_RESOLVED: "complaintAlreadyResolved",
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
