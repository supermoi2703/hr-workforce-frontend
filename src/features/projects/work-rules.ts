import type { BOARD_STATUSES, MyWork, TaskCard, TaskSkillInput, WeekCell, WorkCategory } from "./work-types";

const MINUTES_PER_HOUR = 60;

/** 90 → "1h30", 480 → "8h". */
export function formatMinutes(minutes: number | null | undefined, fallback = "—"): string {
  if (minutes == null) return fallback;
  const sign = minutes < 0 ? "-" : "";
  const value = Math.abs(minutes);
  const hours = Math.floor(value / MINUTES_PER_HOUR);
  const rest = value % MINUTES_PER_HOUR;
  if (rest === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h${String(rest).padStart(2, "0")}`;
}

/** Nhập "8", "1.5", "1,5" hoặc "1:30" → số phút; sai định dạng thì null. */
export function parseHours(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(text);
  if (clock) return Number(clock[1]) * MINUTES_PER_HOUR + Number(clock[2]);
  const hours = Number(text.replace(",", "."));
  if (!Number.isFinite(hours) || hours < 0) return null;
  return Math.round(hours * MINUTES_PER_HOUR);
}

export type BoardColumn = { status: (typeof BOARD_STATUSES)[number]; cards: TaskCard[] };

export function toColumns(statuses: readonly (typeof BOARD_STATUSES)[number][], cards: TaskCard[]): BoardColumn[] {
  return statuses.map((status) => ({ status, cards: cards.filter((card) => card.status === status) }));
}

export type WorkGroup = "overdue" | "thisWeek" | "later" | "noDue";

/** Gom việc của tôi theo hạn: quá hạn, tới Chủ nhật tuần này, sau đó, không có hạn. */
export function workGroup(dueDate: string | null, today: string, sunday: string): WorkGroup {
  if (!dueDate) return "noDue";
  if (dueDate < today) return "overdue";
  return dueDate <= sunday ? "thisWeek" : "later";
}

export function sundayOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = (7 - date.getUTCDay()) % 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function groupMyWork(tasks: MyWork["tasks"], today: string) {
  const sunday = sundayOf(today);
  const groups: Record<WorkGroup, MyWork["tasks"]> = { overdue: [], thisWeek: [], later: [], noDue: [] };
  for (const task of tasks) groups[workGroup(task.card.dueDate, today, sunday)].push(task);
  return groups;
}

export type LoadTone = "over" | "high" | "normal" | "low" | "off";

/** Màu ô năng lực: quá tải, gần đầy (từ 80%), bình thường, ít việc (dưới 20%), không có giờ làm. */
export function loadTone(cell: Pick<WeekCell, "capacityMinutes" | "loadMinutes">): LoadTone {
  if (cell.capacityMinutes === 0) return cell.loadMinutes > 0 ? "over" : "off";
  const ratio = cell.loadMinutes / cell.capacityMinutes;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "high";
  return ratio < 0.2 ? "low" : "normal";
}

export function percent(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.min(100, Math.round((part / whole) * 100));
}

// ===== Nhóm công việc và ngày của việc (workload bước 1)

/** Phần form chịu ảnh hưởng khi chọn nhóm công việc. Cờ *Touched: PM đã tự sửa ô đó. */
export type CategoryDraft = {
  estimate: string;
  skills: TaskSkillInput[];
  estimateTouched: boolean;
  skillsTouched: boolean;
};

/** 480 → "8", 90 → "1.5": giờ để điền vào ô ước lượng. */
export function minutesToHoursText(minutes: number): string {
  return String(Math.round((minutes / MINUTES_PER_HOUR) * 100) / 100);
}

/** Giờ và kỹ năng gợi ý của nhóm, cùng dạng với form. */
export function categorySuggestion(category: WorkCategory): { estimate: string; skills: TaskSkillInput[] } {
  return {
    estimate: minutesToHoursText(category.defaultMinutes),
    skills: category.skills.map((skill) => ({ skillId: skill.skillId, minLevel: skill.minLevel })),
  };
}

/** Cùng tập kỹ năng và cùng mức, không tính thứ tự. */
export function sameSkills(a: TaskSkillInput[], b: TaskSkillInput[]): boolean {
  if (a.length !== b.length) return false;
  const levels = new Map(a.map((skill) => [skill.skillId, skill.minLevel]));
  return b.every((skill) => levels.has(skill.skillId) && levels.get(skill.skillId) === skill.minLevel);
}

/** Giờ hoặc kỹ năng đang khác gợi ý của nhóm: hiện nút "Áp dụng gợi ý". */
export function differsFromSuggestion(draft: Pick<CategoryDraft, "estimate" | "skills">, category: WorkCategory): boolean {
  return parseHours(draft.estimate) !== category.defaultMinutes || !sameSkills(draft.skills, categorySuggestion(category).skills);
}

/**
 * Đổi nhóm công việc. Việc mới: điền giờ, kỹ năng của nhóm vào ô PM chưa tự sửa. Sửa việc: không tự ghi đè (PM bấm
 * "Áp dụng gợi ý" nếu muốn). Bỏ chọn nhóm: giữ nguyên.
 */
export function applyCategory(draft: CategoryDraft, category: WorkCategory | null, mode: "create" | "edit"): CategoryDraft {
  if (!category || mode === "edit") return draft;
  const suggestion = categorySuggestion(category);
  return {
    ...draft,
    estimate: draft.estimateTouched ? draft.estimate : suggestion.estimate,
    skills: draft.skillsTouched ? draft.skills : suggestion.skills,
  };
}

/** Nút "Áp dụng gợi ý": thay cả giờ và kỹ năng, coi như chưa tự sửa. */
export function applySuggestion(draft: CategoryDraft, category: WorkCategory): CategoryDraft {
  const suggestion = categorySuggestion(category);
  return { estimate: suggestion.estimate, skills: suggestion.skills, estimateTouched: false, skillsTouched: false };
}

/** Ngày bắt đầu không sau hạn (chuỗi yyyy-MM-dd so sánh được trực tiếp). Thiếu một bên thì hợp lệ. */
export function dateRangeValid(start: string | null | undefined, due: string | null | undefined): boolean {
  return !start || !due || start <= due;
}

/** Ngày hiển thị của việc và ngày nào lấy theo sprint (việc để trống, backend điền theo sprint). */
export function scheduleInfo(card: Pick<TaskCard, "startDate" | "dueDate" | "scheduledStart" | "scheduledEnd">) {
  return {
    start: card.startDate ?? card.scheduledStart,
    end: card.dueDate ?? card.scheduledEnd,
    startFromSprint: !card.startDate && !!card.scheduledStart,
    endFromSprint: !card.dueDate && !!card.scheduledEnd,
  };
}
