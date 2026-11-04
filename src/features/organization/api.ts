import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { DepartmentInput, MemberFilters, OrgChart, OrgChartMember, OrgChartOffice, TeamInput } from "./types";

/** Cây phòng ban → team. Có `officeId` thì chỉ đếm người của văn phòng đó và bỏ nút rỗng (404 nếu không có văn phòng). */
export const getOrgChart = (officeId?: string) => http.get<OrgChart>("/api/org-chart", { query: { officeId } });

/** Văn phòng đang dùng kèm số người. */
export const getOrgChartOffices = () => http.get<OrgChartOffice[]>("/api/org-chart/offices");

/** Người của một nút (phân trang). Thứ tự do backend quyết định: trưởng trước, rồi theo tên; không gửi sort. */
export const getOrgChartMembers = (filters: MemberFilters, params: PageParams) =>
  http.get<PageResponse<OrgChartMember>>("/api/org-chart/members", {
    query: {
      ...toPageQuery({ page: params.page, size: params.size }),
      officeId: filters.officeId,
      departmentId: filters.departmentId,
      teamId: filters.teamId,
      withoutTeam: filters.withoutTeam || undefined,
      keyword: filters.keyword || undefined,
    },
  });

// ===== Quản trị đơn vị (cần org:manage; README backend organization mục 9). Trả về DTO quản trị, màn hình chỉ cần
// biết đã xong để tải lại cây nên để kiểu unknown.

const enc = encodeURIComponent;

export const createDepartment = (body: DepartmentInput) => http.post<unknown>("/api/departments", body);
export const updateDepartment = (id: string, body: DepartmentInput) => http.put<unknown>(`/api/departments/${enc(id)}`, body);
/** Phòng còn team đang dùng hoặc còn người đang làm việc thì backend từ chối (409). */
export const deactivateDepartment = (id: string) => http.post<unknown>(`/api/departments/${enc(id)}/deactivate`);
/** employeeId null = bỏ trống. Người được gán phải ACTIVE và thuộc phòng. */
export const assignDepartmentHead = (id: string, employeeId: string | null) =>
  http.put<unknown>(`/api/departments/${enc(id)}/head`, { employeeId });

export const createTeam = (body: TeamInput) => http.post<unknown>("/api/teams", body);
export const updateTeam = (id: string, body: TeamInput) => http.put<unknown>(`/api/teams/${enc(id)}`, body);
/** Team còn người đang làm việc thì backend từ chối (409). */
export const deactivateTeam = (id: string) => http.post<unknown>(`/api/teams/${enc(id)}/deactivate`);
/** employeeId null = bỏ trống. Người được gán phải ACTIVE và là thành viên team. */
export const assignTeamLead = (id: string, employeeId: string | null) =>
  http.put<unknown>(`/api/teams/${enc(id)}/lead`, { employeeId });
