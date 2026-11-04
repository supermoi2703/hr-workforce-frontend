import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import { requirementToParam } from "./rules";
import type {
  DeclareSkillInput,
  EmployeeSkill,
  OrgChartForSkills,
  OrgUnitOption,
  PendingSkill,
  Skill,
  SkillInput,
  SkillSearchCriteria,
  SkillSearchResult,
} from "./types";

const enc = encodeURIComponent;

// ===== Danh mục (xem: mọi người đã đăng nhập; sửa: skill:manage)

/** Cả kỹ năng đã ngừng dùng; sắp theo nhóm rồi tên. Danh mục nhỏ (~50) nên lọc ở frontend. */
export const getSkills = () => http.get<Skill[]>("/api/skills", { query: { includeInactive: true } });
export const createSkill = (body: SkillInput) => http.post<Skill>("/api/skills", body);
export const updateSkill = (id: string, body: SkillInput) => http.put<Skill>(`/api/skills/${enc(id)}`, body);
export const setSkillActive = (id: string, active: boolean) =>
  http.post<Skill>(`/api/skills/${enc(id)}/${active ? "activate" : "deactivate"}`);

// ===== Của mình (cần hồ sơ nhân viên: không có thì EMPLOYEE_PROFILE_REQUIRED)

export const getMySkills = () => http.get<EmployeeSkill[]>("/api/employees/me/skills");
/** Khai mới hoặc sửa. Đổi mức thì mất xác nhận cũ, trừ khi bằng mức đã chốt. */
export const declareSkill = (skillId: string, body: DeclareSkillInput) =>
  http.put<EmployeeSkill>(`/api/employees/me/skills/${enc(skillId)}`, body);
export const removeMySkill = (skillId: string) => http.delete<void>(`/api/employees/me/skills/${enc(skillId)}`);

// ===== Của người khác

/** Chính mình, skill:read, hoặc người xác nhận được cho họ. */
export const getEmployeeSkills = (employeeId: string) =>
  http.get<EmployeeSkill[]>(`/api/employees/${enc(employeeId)}/skills`);
/** Chốt đúng mức tự khai (skill:verify + phạm vi; không tự xác nhận). */
export const confirmSkill = (employeeId: string, skillId: string) =>
  http.post<EmployeeSkill>(`/api/employees/${enc(employeeId)}/skills/${enc(skillId)}/confirm`);
/** Chốt mức khác, hoặc thêm hộ kỹ năng nhân viên chưa khai. */
export const setConfirmedLevel = (employeeId: string, skillId: string, level: number) =>
  http.put<EmployeeSkill>(`/api/employees/${enc(employeeId)}/skills/${enc(skillId)}`, { level });

/** Hàng chờ xác nhận của tôi, cũ nhất trước, không gồm kỹ năng của mình. Thứ tự do backend: không gửi sort. */
export const getPendingSkills = (params: PageParams) =>
  http.get<PageResponse<PendingSkill>>("/api/employee-skills/pending", {
    query: toPageQuery({ page: params.page, size: params.size }),
  });

/** Người đang làm việc đạt mọi yêu cầu (1–10), sắp theo tên. */
export const searchBySkills = (criteria: SkillSearchCriteria, params: PageParams) =>
  http.get<PageResponse<SkillSearchResult>>("/api/employee-skills/search", {
    query: {
      ...toPageQuery({ page: params.page, size: params.size }),
      require: criteria.requirements.map(requirementToParam),
      officeId: criteria.officeId,
      departmentId: criteria.departmentId,
      teamId: criteria.teamId,
      confirmedOnly: criteria.confirmedOnly || undefined,
    },
  });

// ===== Đơn vị tổ chức để lọc và hiện tên (mọi người đã đăng nhập đều xem được)

export const getOrgChartForSkills = () => http.get<OrgChartForSkills>("/api/org-chart");
export const getOfficesForSkills = () => http.get<OrgUnitOption[]>("/api/org-chart/offices");
