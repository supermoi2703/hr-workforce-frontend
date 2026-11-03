import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { ApprovalDetail, ApprovalStatus, ApprovalSummary, ApprovalType } from "./types";

const base = (id: string) => `/api/approvals/${encodeURIComponent(id)}`;

/** Yêu cầu đang chờ TÔI quyết định ở bước hiện tại. */
export const getInbox = (type: ApprovalType | undefined, params: PageParams) =>
  http.get<PageResponse<ApprovalSummary>>("/api/approvals/inbox", { query: { ...toPageQuery(params), type } });

/** Yêu cầu tôi đã gửi. */
export const getMine = (filters: { type?: ApprovalType; status?: ApprovalStatus }, params: PageParams) =>
  http.get<PageResponse<ApprovalSummary>>("/api/approvals/mine", {
    query: { ...toPageQuery(params), type: filters.type, status: filters.status },
  });

/** Mọi yêu cầu trong phạm vi dữ liệu (approval:read-all). Lọc theo văn phòng (`officeId`) chưa làm. */
export const getAll = (filters: { type?: ApprovalType; status?: ApprovalStatus }, params: PageParams) =>
  http.get<PageResponse<ApprovalSummary>>("/api/approvals", {
    query: { ...toPageQuery(params), type: filters.type, status: filters.status },
  });

/** Chi tiết: các bước, người duyệt, dòng thời gian. Không được xem → 404 APPROVAL_NOT_FOUND. */
export const getApproval = (id: string) => http.get<ApprovalDetail>(base(id));

/** Duyệt phần của tôi ở bước hiện tại; ghi chú không bắt buộc. */
export const approveApproval = (id: string, comment: string | null) =>
  http.post<ApprovalSummary>(`${base(id)}/approve`, { comment });

/** Từ chối cả yêu cầu; lý do bắt buộc. */
export const rejectApproval = (id: string, comment: string) =>
  http.post<ApprovalSummary>(`${base(id)}/reject`, { comment });

/** Người gửi rút yêu cầu đang chờ; lý do không bắt buộc. */
export const withdrawApproval = (id: string, reason: string | null) =>
  http.post<ApprovalSummary>(`${base(id)}/withdraw`, { reason });
