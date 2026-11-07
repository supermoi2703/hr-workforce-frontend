import { http } from "@/lib/api/http-client";
import type { PageResponse } from "@/lib/api/types";
import type {
  ApprovalSummary,
  EmployeeTimesheet,
  LeaveBalance,
  LeaveDraft,
  LeavePreview,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveType,
  MyWorkSchedule,
  RemoteWorkDraft,
  RemoteWorkPreview,
  RemoteWorkRequest,
  RemoteWorkUsage,
  ShiftChange,
} from "./types";

// ===== Bảng công =====

export const getTimesheet = (from: string, to: string, employeeId?: string) =>
  http.get<EmployeeTimesheet>("/api/timesheet-days", { query: { from, to, employeeId } });

/** Bảng công của những người trong phạm vi (quản lý: đội của mình), tối đa 31 ngày. */
export const getTeamTimesheet = (from: string, to: string) =>
  http.get<EmployeeTimesheet[]>("/api/timesheet-days/team", { query: { from, to } });

// ===== Giờ làm =====

export const getMySchedule = () => http.get<MyWorkSchedule>("/api/work-schedules/me");

/** startTime null = xin quay về giờ của văn phòng. */
export const submitShiftChange = (startTime: string | null, reason: string) =>
  http.post<ShiftChange>("/api/shift-change-requests", { startTime, reason });

export const listMyShiftChanges = () => http.get<ShiftChange[]>("/api/shift-change-requests/me");

export const withdrawShiftChange = (id: string) => http.post<ShiftChange>(`/api/shift-change-requests/${id}/withdraw`);

// ===== Nghỉ phép =====

export const listLeaveTypes = () => http.get<LeaveType[]>("/api/leave-types");

export const getMyBalance = () => http.get<LeaveBalance>("/api/leave-balances/me");

export const previewLeave = (draft: LeaveDraft) => http.post<LeavePreview>("/api/leave-requests/preview", draft);

export const submitLeave = (draft: LeaveDraft, reason: string) =>
  http.post<LeaveRequest>("/api/leave-requests", { ...draft, reason });

export const listMyLeave = () => http.get<LeaveRequest[]>("/api/leave-requests/me");

export const getLeave = (id: string) => http.get<LeaveRequestDetail>(`/api/leave-requests/${id}`);

export const withdrawLeave = (id: string) => http.post<LeaveRequest>(`/api/leave-requests/${id}/withdraw`);

export const cancelLeave = (id: string, reason: string) =>
  http.post<LeaveRequest>(`/api/leave-requests/${id}/cancel`, { reason });

// ===== Làm từ xa =====

export const previewRemoteWork = (draft: RemoteWorkDraft) =>
  http.post<RemoteWorkPreview>("/api/remote-work-requests/preview", draft);

export const submitRemoteWork = (draft: RemoteWorkDraft, detail: string) =>
  http.post<RemoteWorkRequest>("/api/remote-work-requests", { ...draft, detail });

export const listMyRemoteWork = () => http.get<RemoteWorkRequest[]>("/api/remote-work-requests/me");

export const getMyRemoteUsage = () => http.get<RemoteWorkUsage>("/api/remote-work-requests/me/usage");

export const withdrawRemoteWork = (id: string) => http.post<RemoteWorkRequest>(`/api/remote-work-requests/${id}/withdraw`);

export const cancelRemoteWork = (id: string, reason: string) =>
  http.post<RemoteWorkRequest>(`/api/remote-work-requests/${id}/cancel`, { reason });

// ===== Duyệt (bộ máy chung /api/approvals) =====

export const listInbox = () =>
  http.get<PageResponse<ApprovalSummary>>("/api/approvals/inbox", { query: { size: 100 } });

export const approve = (id: string, comment?: string) =>
  http.post<ApprovalSummary>(`/api/approvals/${id}/approve`, { comment: comment || null });

export const reject = (id: string, comment: string) =>
  http.post<ApprovalSummary>(`/api/approvals/${id}/reject`, { comment });
