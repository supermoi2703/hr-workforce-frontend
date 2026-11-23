import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  AssignOvertimeInput,
  ClaimDraft,
  ClaimOvertimeInput,
  MyOvertime,
  OfficeOption,
  OvertimeListFilters,
  OvertimeRequest,
  OvertimeUsage,
} from "./types";

/**
 * Tiền tố theo hợp đồng ot-kpi-api.md (`/api/v1/...`). Các module khác của backend dùng `/api/...` không có version:
 * nếu backend làm theo quy ước chung thì chỉ cần sửa dòng này.
 */
export const OVERTIME_API = "/api/v1";

const enc = encodeURIComponent;
const reasonOf = (reason?: string | null) => (reason && reason.trim() ? reason.trim() : null);

export const assignOvertime = (body: AssignOvertimeInput) =>
  http.post<OvertimeRequest>(`${OVERTIME_API}/overtime/assignments`, { ...body, reason: reasonOf(body.reason) });

export const claimOvertime = (body: ClaimOvertimeInput) =>
  http.post<OvertimeRequest>(`${OVERTIME_API}/overtime/claims`, { ...body, reason: reasonOf(body.reason) });

export const acceptOvertime = (id: string) => http.post<OvertimeRequest>(`${OVERTIME_API}/overtime/${enc(id)}/accept`);

export const declineOvertime = (id: string, reason?: string | null) =>
  http.post<OvertimeRequest>(`${OVERTIME_API}/overtime/${enc(id)}/decline`, { reason: reasonOf(reason) });

/** PM hủy phiếu ASSIGNED trước giờ bắt đầu, hoặc nhân viên rút phiếu CLAIMED đang chờ duyệt. */
export const cancelOvertime = (id: string, reason?: string | null) =>
  http.post<OvertimeRequest>(`${OVERTIME_API}/overtime/${enc(id)}/cancel`, { reason: reasonOf(reason) });

export const getOvertime = (id: string) => http.get<OvertimeRequest>(`${OVERTIME_API}/overtime/${enc(id)}`);

export const getMyOvertime = (month: string) => http.get<MyOvertime>(`${OVERTIME_API}/overtime/me`, { query: { month } });

export const getClaimDraft = (date: string) => http.get<ClaimDraft>(`${OVERTIME_API}/overtime/claim-draft`, { query: { date } });

export const getOvertimeUsage = (employeeId: string, date: string) =>
  http.get<OvertimeUsage>(`${OVERTIME_API}/overtime/usage`, { query: { employeeId, date } });

export const getProjectOvertime = (projectId: string, month: string) =>
  http.get<OvertimeRequest[]>(`${OVERTIME_API}/projects/${enc(projectId)}/overtime`, { query: { month } });

export const listOvertime = (filters: OvertimeListFilters, params: PageParams) =>
  http.get<PageResponse<OvertimeRequest>>(`${OVERTIME_API}/overtime`, {
    query: { ...toPageQuery(params), month: filters.month, officeId: filters.officeId, status: filters.status },
  });

/** Văn phòng cho bộ lọc: khung cây tổ chức, ai đăng nhập cũng xem được. */
export const getOffices = () => http.get<OfficeOption[]>("/api/org-chart/offices");
