import { foldText } from "@/lib/text";
import {
  SKILL_CATEGORIES,
  SKILL_TABS,
  type CatalogStatus,
  type EmployeeSkill,
  type Skill,
  type SkillCategory,
  type SkillRequirement,
  type SkillSearchCriteria,
  type SkillStatus,
  type SkillTab,
} from "./types";

export const SKILL_MANAGE_PERMISSION = "skill:manage";
export const SKILL_READ_PERMISSION = "skill:read";

/** Khớp SkillConstants.CODE_REGEX của backend. */
export const SKILL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
/** Số yêu cầu tối đa trong một lần tìm (SkillConstants.MAX_SEARCH_REQUIREMENTS). */
export const MAX_REQUIREMENTS = 10;

// ===== Tab theo quyền

/**
 * Tab người dùng được thấy: "Của tôi" luôn có. "Chờ xác nhận" theo `canVerify` của backend (cấp dưới trên sơ đồ hoặc phạm
 * vi skill:verify), không theo role: trưởng team role Employee vẫn có. Tìm người, danh mục theo permission.
 */
export function availableTabs(hasPermission: (permission: string) => boolean, canVerify: boolean): SkillTab[] {
  return SKILL_TABS.filter((tab) => {
    if (tab === "pending") return canVerify;
    if (tab === "search") return hasPermission(SKILL_READ_PERMISSION);
    if (tab === "catalog") return hasPermission(SKILL_MANAGE_PERMISSION);
    return true;
  });
}

// ===== Trạng thái trang trên URL: ?tab=search&require=JAVA:3&require=SPRING_BOOT&office=...&confirmed=1

export type SkillPageState = { tab: SkillTab; criteria: SkillSearchCriteria };

export function stateFromSearchParams(params: URLSearchParams, allowed: SkillTab[]): SkillPageState {
  const rawTab = params.get("tab") as SkillTab | null;
  const tab = rawTab && allowed.includes(rawTab) ? rawTab : "mine";
  const requirements = params
    .getAll("require")
    .map(parseRequirement)
    .filter((r): r is SkillRequirement => r !== null);
  return {
    tab,
    criteria: {
      requirements: dedupeRequirements(requirements).slice(0, MAX_REQUIREMENTS),
      officeId: params.get("office") || undefined,
      departmentId: params.get("department") || undefined,
      teamId: params.get("team") || undefined,
      confirmedOnly: params.get("confirmed") === "1",
    },
  };
}

export function stateToSearchParams(state: SkillPageState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tab !== "mine") params.set("tab", state.tab);
  if (state.tab === "search") {
    const { criteria } = state;
    criteria.requirements.forEach((r) => params.append("require", requirementToParam(r)));
    if (criteria.officeId) params.set("office", criteria.officeId);
    if (criteria.departmentId) params.set("department", criteria.departmentId);
    if (criteria.teamId) params.set("team", criteria.teamId);
    if (criteria.confirmedOnly) params.set("confirmed", "1");
  }
  return params;
}

/** `JAVA:3` → { JAVA, 3 }; thiếu mức = 1 (như backend). Sai định dạng → null. */
export function parseRequirement(value: string): SkillRequirement | null {
  const [rawCode, rawLevel, ...rest] = value.trim().split(":");
  if (rest.length > 0 || !rawCode || !SKILL_CODE_PATTERN.test(rawCode)) return null;
  const minLevel = rawLevel === undefined || rawLevel === "" ? MIN_LEVEL : Number(rawLevel);
  if (!Number.isInteger(minLevel) || minLevel < MIN_LEVEL || minLevel > MAX_LEVEL) return null;
  return { code: rawCode.toUpperCase(), minLevel };
}

export function requirementToParam(requirement: SkillRequirement): string {
  return `${requirement.code}:${requirement.minLevel}`;
}

/** Cùng một kỹ năng chọn hai lần thì giữ lần đầu. */
export function dedupeRequirements(requirements: SkillRequirement[]): SkillRequirement[] {
  const seen = new Set<string>();
  return requirements.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
}

// ===== Kỹ năng đã khai

export function skillStatus(skill: Pick<EmployeeSkill, "confirmed" | "selfLevel" | "confirmedLevel">): SkillStatus {
  if (!skill.confirmed) return "pending";
  if (skill.selfLevel === null) return "addedByManager";
  return skill.selfLevel === skill.confirmedLevel ? "confirmed" : "adjusted";
}

/** Gom theo nhóm, đúng thứ tự nhóm của backend; trong nhóm giữ thứ tự nhận được. Nhóm rỗng bị bỏ. */
export function groupByCategory<T extends { category: SkillCategory }>(items: T[]): { category: SkillCategory; items: T[] }[] {
  return SKILL_CATEGORIES.map((category) => ({ category, items: items.filter((item) => item.category === category) })).filter(
    (group) => group.items.length > 0,
  );
}

/** Đếm theo trạng thái để hiện tóm tắt đầu trang "Của tôi". */
export function countByStatus(skills: EmployeeSkill[]): { total: number; pending: number; confirmed: number } {
  const pending = skills.filter((s) => !s.confirmed).length;
  return { total: skills.length, pending, confirmed: skills.length - pending };
}

/** Chốt mức khác mức nhân viên tự khai thì phải ghi lý do (backend: SKILL_CONFIRM_NOTE_REQUIRED). */
export function requiresConfirmNote(selfLevel: number | null | undefined, level: number | null): boolean {
  return selfLevel != null && level != null && selfLevel !== level;
}

// ===== Danh mục

export type CatalogFilter = { text: string; category?: SkillCategory; status: CatalogStatus };

/** Lọc theo tên / mã (không dấu), nhóm, trạng thái (đang dùng / ngừng dùng / tất cả). */
export function filterSkills(skills: Skill[], filter: CatalogFilter): Skill[] {
  const needle = foldText(filter.text);
  return skills.filter(
    (skill) =>
      (filter.status === "all" || skill.active === (filter.status === "active")) &&
      (!filter.category || skill.category === filter.category) &&
      (!needle || foldText(skill.name).includes(needle) || foldText(skill.code).includes(needle)),
  );
}

/** Gom theo nhóm như groupByCategory, trong nhóm đưa kỹ năng ngừng dùng xuống cuối (giữ thứ tự tên của backend). */
export function groupCatalog(skills: Skill[]): { category: SkillCategory; items: Skill[] }[] {
  return groupByCategory(skills).map((group) => ({
    category: group.category,
    items: [...group.items.filter((s) => s.active), ...group.items.filter((s) => !s.active)],
  }));
}

export function countCatalog(skills: Skill[]): Record<CatalogStatus, number> {
  const active = skills.filter((s) => s.active).length;
  return { active, inactive: skills.length - active, all: skills.length };
}

/** Số năm kinh nghiệm từ ô nhập: trống → null; dấu phẩy được hiểu là dấu thập phân. */
export function parseYears(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  return Number(trimmed);
}

/** Hợp lệ theo DeclareSkillRequest: 0–50, tối đa một chữ số thập phân. */
export function isValidYears(value: number | null): boolean {
  if (value === null) return true;
  return Number.isFinite(value) && value >= 0 && value <= 50 && Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}
