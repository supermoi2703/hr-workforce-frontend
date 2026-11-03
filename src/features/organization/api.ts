import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { MemberFilters, OrgChart, OrgChartMember, OrgChartOffice } from "./types";

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
