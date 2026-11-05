// Kiểu dữ liệu khớp DTO của module employee (backend README employee mục 7) và danh mục tổ chức (module organization).
import type { UserStatus } from "@/lib/auth/types";

/** Trạng thái hồ sơ: đã nhận việc chưa tới ngày vào → đang làm → nghỉ dài → đã nghỉ việc. */
export const EMPLOYEE_STATUSES = ["ONBOARDING", "ACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_LEVELS = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;
export type EmployeeLevel = (typeof EMPLOYEE_LEVELS)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PROBATION", "INTERN", "CONTRACTOR"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

/** Một dòng của GET /api/employees: chỉ thông tin tổ chức / công việc, không có thông tin cá nhân. */
export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  officeId: string;
  departmentId: string;
  teamId: string | null;
  positionId: string;
  level: EmployeeLevel;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  /** "yyyy-MM-dd" */
  hireDate: string;
  terminationDate: string | null;
  hasAccount: boolean;
};

/** Thông tin cá nhân: nhân viên tự sửa, HR trong phạm vi sửa được; Manager không thấy. */
export type PersonalInfo = {
  phone: string | null;
  personalEmail: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
};

export type EmployeeRef = { id: string; employeeCode: string; fullName: string };

/** Tài khoản đăng nhập gắn hồ sơ. */
export type EmployeeAccount = { userId: string; status: UserStatus };

/** GET /api/employees/{id} và /api/employees/me. */
export type EmployeeDetail = Omit<EmployeeListItem, "hasAccount"> & {
  managerEmployeeId: string | null;
  /** Quản lý trực tiếp (suy ra từ tổ chức). Chỉ có ở backend từ 1.4; thiếu thì coi như chưa biết. */
  manager?: EmployeeRef | null;
  /** null = người xem không được thấy (vd Manager). */
  personal: PersonalInfo | null;
  account: EmployeeAccount | null;
  /** Gửi lại khi sửa (chống ghi đè). */
  version: number;
  updatedAt: string;
};

/** Body POST / PUT /api/employees: thay TOÀN BỘ, kể cả `personal` (null = xóa trắng). */
export type EmployeeInput = {
  fullName: string;
  workEmail: string;
  officeId: string;
  departmentId: string;
  teamId: string | null;
  positionId: string;
  level: EmployeeLevel;
  employmentType: EmploymentType;
  hireDate: string;
  personal: PersonalInfo | null;
  version?: number;
};

/** Body POST /api/employees/{id}/status. */
export type EmployeeStatusInput = {
  status: EmployeeStatus;
  terminationDate: string | null;
  reason: string | null;
  version: number;
};

/** Cảnh báo sau khi đổi trạng thái: người này đang là trưởng phòng / trưởng team. */
export type EmployeeStatusWarning = "EMPLOYEE_IS_UNIT_HEAD";

export type EmployeeStatusResult = { employee: EmployeeDetail; warnings: string[] };

/** CCCD, mã số thuế, BHXH, ngân hàng, người phụ thuộc. `version` null = chưa khai lần nào. */
export type SensitiveInfo = {
  employeeId: string;
  nationalId: string | null;
  nationalIdIssuedOn: string | null;
  nationalIdIssuedPlace: string | null;
  taxCode: string | null;
  socialInsuranceNo: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountHolder: string | null;
  taxDependents: number;
  version: number | null;
};

export type SensitiveInput = Omit<SensitiveInfo, "employeeId">;

/** Bộ lọc của GET /api/employees. Bỏ trống = không lọc. */
export type EmployeeFilters = {
  keyword?: string;
  officeId?: string;
  departmentId?: string;
  teamId?: string;
  status?: EmployeeStatus;
};

// ===== Danh mục tổ chức (GET /api/offices, /departments, /teams, /positions; chỉ cần đăng nhập) =====

export type OrgUnit = { id: string; code: string; name: string; active: boolean };
export type TeamUnit = OrgUnit & { departmentId: string };

export type OrgUnits = {
  offices: OrgUnit[];
  departments: OrgUnit[];
  teams: TeamUnit[];
  positions: OrgUnit[];
};
