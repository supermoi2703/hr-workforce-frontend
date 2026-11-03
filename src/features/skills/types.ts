// Kiểu dữ liệu khớp DTO của module kỹ năng (backend: modules/skill/README.md mục 5).

/** Nhóm kỹ năng: danh sách cố định ở backend (SkillCategory), theo thứ tự hiển thị. */
export const SKILL_CATEGORIES = [
  "PROGRAMMING_LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "CLOUD_DEVOPS",
  "TESTING",
  "FOREIGN_LANGUAGE",
  "SOFT_SKILL",
  "DOMAIN",
  "OTHER",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Thang mức 1–5 (docs/policies/skill.md mục 2). */
export const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Một kỹ năng trong danh mục (SkillResponse). */
export type Skill = {
  id: string;
  code: string;
  name: string;
  category: SkillCategory;
  description: string | null;
  /** false = đã ngừng dùng: không khai mới được, kỹ năng đã khai vẫn giữ. */
  active: boolean;
};

/** Một kỹ năng của một nhân viên (EmployeeSkillResponse). */
export type EmployeeSkill = {
  skillId: string;
  skillCode: string;
  skillName: string;
  category: SkillCategory;
  skillActive: boolean;
  /** Mức nhân viên tự khai; null = quản lý thêm hộ. */
  selfLevel: number | null;
  /** Mức quản lý chốt; null = chưa xác nhận. */
  confirmedLevel: number | null;
  /** Mức hiệu lực: confirmedLevel nếu có, không thì selfLevel. */
  level: number;
  confirmed: boolean;
  yearsExperience: number | null;
  note: string | null;
  confirmedByEmployeeId: string | null;
  confirmedAt: string | null;
  updatedAt: string;
};

/** Một dòng của hàng chờ xác nhận (PendingSkillResponse). */
export type PendingSkill = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  skill: EmployeeSkill;
};

/** Cấp bậc trong hồ sơ (EmployeeLevel), không phải mức kỹ năng. */
export type EmployeeLevel = "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";

/** Một người đạt mọi yêu cầu của lần tìm (SkillSearchResultResponse). */
export type SkillSearchResult = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string | null;
  departmentId: string | null;
  teamId: string | null;
  positionId: string | null;
  level: EmployeeLevel | null;
  /** Kỹ năng khớp yêu cầu, theo thứ tự yêu cầu. */
  matchedSkills: EmployeeSkill[];
};

/** Body PUT /api/employees/me/skills/{skillId}. */
export type DeclareSkillInput = {
  level: number;
  yearsExperience: number | null;
  note: string | null;
};

/** Body POST / PUT /api/skills (backend tự viết hoa mã). */
export type SkillInput = {
  code: string;
  name: string;
  category: SkillCategory;
  description: string | null;
};

/** Một yêu cầu khi tìm: mã kỹ năng + mức tối thiểu (gửi lên dạng `CODE:level`). */
export type SkillRequirement = { code: string; minLevel: number };

/** Điều kiện tìm người theo kỹ năng. */
export type SkillSearchCriteria = {
  requirements: SkillRequirement[];
  officeId?: string;
  departmentId?: string;
  teamId?: string;
  /** true = chỉ tính mức quản lý đã xác nhận. */
  confirmedOnly: boolean;
};

/** Các tab của trang /skills. */
export const SKILL_TABS = ["mine", "pending", "search", "catalog"] as const;
export type SkillTab = (typeof SKILL_TABS)[number];

/**
 * Trạng thái hiển thị của một kỹ năng đã khai:
 * - pending: chờ quản lý xác nhận;
 * - confirmed: quản lý xác nhận đúng mức tự khai;
 * - adjusted: quản lý chốt mức khác mức tự khai;
 * - addedByManager: quản lý thêm hộ (nhân viên chưa tự khai).
 */
export type SkillStatus = "pending" | "confirmed" | "adjusted" | "addedByManager";

// ===== Đơn vị tổ chức để lọc và hiện tên trong kết quả tìm (GET /api/org-chart, /api/org-chart/offices).
// Chỉ lấy phần cần dùng; không import từ feature organization (AGENTS.md: feature không import feature khác).

export type OrgUnitOption = { id: string; code: string; name: string };

export type OrgChartForSkills = {
  departments: (OrgUnitOption & { teams: OrgUnitOption[] })[];
};
