import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  EmployeeDetail,
  EmployeeFilters,
  EmployeeInput,
  EmployeeListItem,
  EmployeeStatusInput,
  EmployeeStatusResult,
  OrgUnit,
  PersonalInfo,
  SensitiveInfo,
  SensitiveInput,
  TeamUnit,
} from "./types";

const enc = encodeURIComponent;

/** Tìm hồ sơ trong phạm vi dữ liệu (employee:read). Sắp xếp được: employeeCode (mặc định), fullName, hireDate. */
export const searchEmployees = (filters: EmployeeFilters, params: PageParams) =>
  http.get<PageResponse<EmployeeListItem>>("/api/employees", {
    query: {
      ...toPageQuery(params),
      keyword: filters.keyword,
      officeId: filters.officeId,
      departmentId: filters.departmentId,
      teamId: filters.teamId,
      status: filters.status,
    },
  });

/** Ngoài phạm vi → 404. `personal` chỉ có với HR trong phạm vi và chính nhân viên. */
export const getEmployee = (id: string) => http.get<EmployeeDetail>(`/api/employees/${enc(id)}`);

/** employee:manage. Hồ sơ mới ở trạng thái ONBOARDING; HR văn phòng chỉ tạo trong văn phòng mình. */
export const createEmployee = (body: EmployeeInput) => http.post<EmployeeDetail>("/api/employees", body);

/** Thay toàn bộ (trừ trạng thái), bắt buộc version. */
export const updateEmployee = (id: string, body: EmployeeInput) =>
  http.put<EmployeeDetail>(`/api/employees/${enc(id)}`, body);

/** TERMINATED khóa tài khoản và thu hồi phiên; ON_LEAVE / TERMINATED giao lại các bước duyệt đang chờ. */
export const changeEmployeeStatus = (id: string, body: EmployeeStatusInput) =>
  http.post<EmployeeStatusResult>(`/api/employees/${enc(id)}/status`, body);

/** Module user (user:create): tạo tài khoản PENDING (email = work email, OTP kích hoạt) hoặc gắn tài khoản có sẵn. */
export const provisionAccount = (id: string) =>
  http.post<{ id: string; status: string }>(`/api/employees/${enc(id)}/account`, {});

export const getSensitive = (id: string) => http.get<SensitiveInfo>(`/api/employees/${enc(id)}/sensitive`);

export const updateSensitive = (id: string, body: SensitiveInput) =>
  http.put<SensitiveInfo>(`/api/employees/${enc(id)}/sensitive`, body);

// ===== Hồ sơ của tôi (cần tài khoản gắn hồ sơ, không thì 403 EMPLOYEE_PROFILE_REQUIRED) =====

export const getMyProfile = () => http.get<EmployeeDetail>("/api/employees/me");

/** Thay cả nhóm 5 trường cá nhân. */
export const updateMyProfile = (body: { personal: PersonalInfo; version: number }) =>
  http.put<EmployeeDetail>("/api/employees/me", body);

export const getMySensitive = () => http.get<SensitiveInfo>("/api/employees/me/sensitive");

// ===== Danh mục tổ chức (feature không import features/organization nên tự gọi). Lấy cả đơn vị đã ngừng dùng
// để vẫn hiện được tên của hồ sơ cũ. =====

const ALL = { query: { includeInactive: true } };

export const getOffices = () => http.get<OrgUnit[]>("/api/offices", ALL);
export const getDepartments = () => http.get<OrgUnit[]>("/api/departments", ALL);
export const getTeams = () => http.get<TeamUnit[]>("/api/teams", ALL);
export const getPositions = () => http.get<OrgUnit[]>("/api/positions", ALL);
