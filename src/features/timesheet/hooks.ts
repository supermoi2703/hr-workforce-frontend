"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  approve,
  cancelLeave,
  cancelRemoteWork,
  getMyBalance,
  getMyRemoteUsage,
  getMySchedule,
  getTeamTimesheet,
  getTimesheet,
  listInbox,
  listLeaveTypes,
  listMyLeave,
  listMyRemoteWork,
  listMyShiftChanges,
  previewLeave,
  previewRemoteWork,
  reject,
  submitLeave,
  submitRemoteWork,
  submitShiftChange,
  withdrawLeave,
  withdrawRemoteWork,
  withdrawShiftChange,
} from "./api";
import type { ApprovalSummary, LeaveDraft, RemoteWorkDraft, TimeApprovalType } from "./types";

/** Loại yêu cầu duyệt của cụm công & phép, hiện ở tab "Cần tôi duyệt". */
export const TIME_APPROVAL_TYPES: TimeApprovalType[] = ["LEAVE", "LEAVE_CANCEL", "WFH", "WFH_CANCEL", "SHIFT_CHANGE"];

export type TimeApproval = ApprovalSummary & { type: TimeApprovalType };

export const timesheetKeys = {
  all: ["timesheet"] as const,
  days: (from: string, to: string) => ["timesheet", "days", from, to] as const,
  team: (from: string, to: string) => ["timesheet", "team", from, to] as const,
  schedule: ["timesheet", "schedule"] as const,
  shiftChanges: ["timesheet", "shift-changes"] as const,
  leaveTypes: ["timesheet", "leave-types"] as const,
  balance: ["timesheet", "balance"] as const,
  myLeave: ["timesheet", "my-leave"] as const,
  preview: (draft: LeaveDraft) => ["timesheet", "leave-preview", draft] as const,
  myRemote: ["timesheet", "my-remote"] as const,
  remoteUsage: ["timesheet", "remote-usage"] as const,
  remotePreview: (draft: RemoteWorkDraft | null) => ["timesheet", "remote-preview", draft] as const,
  inbox: ["timesheet", "inbox"] as const,
};

export function useMyTimesheet(from: string, to: string) {
  return useQuery({
    queryKey: timesheetKeys.days(from, to),
    queryFn: () => getTimesheet(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useTeamTimesheet(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: timesheetKeys.team(from, to),
    queryFn: () => getTeamTimesheet(from, to),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMySchedule() {
  return useQuery({ queryKey: timesheetKeys.schedule, queryFn: getMySchedule });
}

export function useMyShiftChanges() {
  return useQuery({ queryKey: timesheetKeys.shiftChanges, queryFn: listMyShiftChanges });
}

export function useLeaveTypes() {
  return useQuery({ queryKey: timesheetKeys.leaveTypes, queryFn: listLeaveTypes, staleTime: 60 * 60 * 1000 });
}

export function useMyBalance() {
  return useQuery({ queryKey: timesheetKeys.balance, queryFn: getMyBalance });
}

export function useMyLeave() {
  return useQuery({ queryKey: timesheetKeys.myLeave, queryFn: listMyLeave });
}

/** Xem trước đơn mỗi khi đổi loại / ngày / buổi (backend tính số ngày thực, số dư, cảnh báo gấp). */
export function useLeavePreview(draft: LeaveDraft | null) {
  return useQuery({
    queryKey: timesheetKeys.preview(draft ?? { leaveType: "ANNUAL", startDate: "", endDate: "", part: "FULL_DAY" }),
    queryFn: () => previewLeave(draft!),
    enabled: !!draft,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useMyRemoteWork() {
  return useQuery({ queryKey: timesheetKeys.myRemote, queryFn: listMyRemoteWork });
}

export function useRemoteUsage() {
  return useQuery({ queryKey: timesheetKeys.remoteUsage, queryFn: getMyRemoteUsage });
}

/** Xem trước đơn WFH mỗi khi đổi ngày / buổi / lý do (backend kiểm tra đối tượng, hạn gửi, giới hạn, trùng đơn). */
export function useRemoteWorkPreview(draft: RemoteWorkDraft | null) {
  return useQuery({
    queryKey: timesheetKeys.remotePreview(draft),
    queryFn: () => previewRemoteWork(draft!),
    enabled: !!draft,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/** Hộp việc của tôi, chỉ giữ yêu cầu công & phép. */
export function useTimeInbox() {
  return useQuery({
    queryKey: timesheetKeys.inbox,
    queryFn: listInbox,
    select: (page) =>
      page.content.filter((item): item is TimeApproval => (TIME_APPROVAL_TYPES as string[]).includes(item.type)),
  });
}

// Đơn từ thay đổi số dư, bảng công và hộp việc: làm mới cả cụm sau mỗi thao tác.
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
}

export function useSubmitShiftChange() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ startTime, reason }: { startTime: string | null; reason: string }) => submitShiftChange(startTime, reason),
    onSuccess: invalidate,
  });
}

export function useWithdrawShiftChange() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: withdrawShiftChange, onSuccess: invalidate });
}

export function useSubmitLeave() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ draft, reason }: { draft: LeaveDraft; reason: string }) => submitLeave(draft, reason),
    onSuccess: invalidate,
  });
}

export function useWithdrawLeave() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: withdrawLeave, onSuccess: invalidate });
}

export function useCancelLeave() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelLeave(id, reason),
    onSuccess: invalidate,
  });
}

export function useSubmitRemoteWork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ draft, detail }: { draft: RemoteWorkDraft; detail: string }) => submitRemoteWork(draft, detail),
    onSuccess: invalidate,
  });
}

export function useWithdrawRemoteWork() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: withdrawRemoteWork, onSuccess: invalidate });
}

export function useCancelRemoteWork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelRemoteWork(id, reason),
    onSuccess: invalidate,
  });
}

export function useDecide() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, approved, comment }: { id: string; approved: boolean; comment: string }) =>
      approved ? approve(id, comment) : reject(id, comment),
    onSuccess: invalidate,
  });
}

type TimesheetErrorKey = keyof Messages["Timesheet"]["errors"];

// Mã lỗi riêng của giờ làm / nghỉ phép / duyệt (backend ErrorCode) → key trong messages Timesheet.errors.
const ERROR_KEYS: Record<string, TimesheetErrorKey> = {
  SHIFT_START_OUT_OF_RANGE: "shiftStartOutOfRange",
  SHIFT_UNCHANGED: "shiftUnchanged",
  SHIFT_REQUEST_PENDING: "shiftRequestPending",
  SHIFT_CHANGE_LIMIT_REACHED: "shiftChangeLimit",
  LEAVE_TYPE_NOT_FOUND: "leaveTypeNotFound",
  LEAVE_INVALID_RANGE: "leaveInvalidRange",
  LEAVE_IN_PAST: "leaveInPast",
  LEAVE_NO_WORKING_DAY: "leaveNoWorkingDay",
  LEAVE_TYPE_MAX_DAYS: "leaveTypeMaxDays",
  LEAVE_OVERLAP: "leaveOverlap",
  LEAVE_INSUFFICIENT_BALANCE: "leaveInsufficientBalance",
  LEAVE_NOT_CANCELLABLE: "leaveNotCancellable",
  REMOTE_NOT_ELIGIBLE: "remoteNotEligible",
  REMOTE_IN_PAST: "remoteInPast",
  REMOTE_NO_WORKING_DAY: "remoteNoWorkingDay",
  REMOTE_TOO_LATE: "remoteTooLate",
  REMOTE_OVERLAP: "remoteOverlap",
  REMOTE_WEEK_LIMIT: "remoteWeekLimit",
  REMOTE_MONTH_LIMIT: "remoteMonthLimit",
  REMOTE_NOT_CANCELLABLE: "remoteNotCancellable",
  APPROVAL_NOT_PENDING: "approvalNotPending",
  APPROVAL_ALREADY_DECIDED: "approvalAlreadyDecided",
  NOT_CURRENT_APPROVER: "notCurrentApprover",
  EMPLOYEE_PROFILE_REQUIRED: "employeeProfileRequired",
};

/** Mã lỗi (từ API hoặc từ trường problem của bản xem trước) → câu thông báo. */
export function useTimesheetErrorMessage() {
  const t = useTranslations("Timesheet.errors");
  const generic = useErrorMessage();
  return useCallback(
    (error: unknown) => {
      const code = typeof error === "string" ? error : isApiError(error) ? error.code : null;
      const key = code ? ERROR_KEYS[code] : undefined;
      if (key) return t(key);
      return typeof error === "string" ? t("unknown") : generic(error);
    },
    [t, generic],
  );
}
