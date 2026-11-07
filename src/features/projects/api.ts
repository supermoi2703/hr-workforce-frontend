import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  CreateProjectInput,
  EmployeeOption,
  Project,
  ProjectCreateScope,
  ProjectFilters,
  ProjectListItem,
  ProjectMember,
  ProjectSettingsInput,
  UnitRef,
  UpdateProjectInput,
} from "./types";

const enc = encodeURIComponent;

export const getProjects = (filters: ProjectFilters, params: PageParams) =>
  http.get<PageResponse<ProjectListItem>>("/api/projects", {
    query: {
      ...toPageQuery(params),
      q: filters.q,
      status: filters.status,
      type: filters.type,
      departmentId: filters.departmentId,
      officeId: filters.officeId,
      mine: filters.mine || undefined,
    },
  });

export const getProjectByCode = (code: string) => http.get<Project>(`/api/projects/by-code/${enc(code)}`);
export const getProjectCreateScope = () => http.get<ProjectCreateScope>("/api/projects/create-scope");

export const createProject = (body: CreateProjectInput) => http.post<Project>("/api/projects", body);
export const updateProject = (id: string, body: UpdateProjectInput) => http.put<Project>(`/api/projects/${enc(id)}`, body);
export const updateProjectSettings = (id: string, body: ProjectSettingsInput) =>
  http.put<Project>(`/api/projects/${enc(id)}/settings`, body);
/** Đổi PM, hoặc đổi % của PM hiện tại nếu vẫn là người cũ. */
export const changeProjectManager = (id: string, employeeId: string, allocationPercent: number) =>
  http.put<Project>(`/api/projects/${enc(id)}/pm`, { employeeId, allocationPercent });
export const closeProject = (id: string) => http.post<Project>(`/api/projects/${enc(id)}/close`);

/** Không có `date`: người chưa rời dự án. Có `date`: người có hiệu lực đúng ngày đó. */
export const getProjectMembers = (id: string, date?: string) =>
  http.get<ProjectMember[]>(`/api/projects/${enc(id)}/members`, { query: { date } });
export const addProjectObserver = (id: string, employeeId: string) =>
  http.post<ProjectMember[]>(`/api/projects/${enc(id)}/observers`, { employeeId });
export const removeProjectObserver = (id: string, employeeId: string) =>
  http.delete<void>(`/api/projects/${enc(id)}/observers/${enc(employeeId)}`);

// ===== Dữ liệu tổ chức: mọi người đã đăng nhập đều xem được (khác /api/employees cần employee:read)

export const getOrgDepartments = () =>
  http.get<{ departments: UnitRef[] }>("/api/org-chart").then((chart) => chart.departments);
export const getOrgOffices = () => http.get<UnitRef[]>("/api/org-chart/offices");
export const searchEmployeeOptions = (keyword: string | undefined, size: number) =>
  http
    .get<PageResponse<EmployeeOption>>("/api/org-chart/members", { query: { keyword, page: 0, size } })
    .then((page) => page.content);
