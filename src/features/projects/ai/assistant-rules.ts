import type { TaskFormInitial } from "../components/task-form-dialog";
import type { SuggestionInitialCriteria } from "../components/suggest-assignee-dialog";
import type { SuggestionCandidate } from "../work-types";
import type { AssistantEntry, AssistantTurn, Understood } from "./types";

/** Số lượt trước gửi kèm câu hỏi (backend chỉ dùng 2 lượt cuối). */
export const HISTORY_TURNS = 2;
/** Số người hiện sẵn khi câu hỏi không nói cần mấy người. */
export const DEFAULT_SHOWN = 5;
export const MAX_QUESTION_LENGTH = 300;

/** Một chip "Trợ lý đã hiểu". Chữ do giao diện dịch theo `kind`. */
export type UnderstoodChip =
  | { kind: "task"; key: string }
  | { kind: "work"; text: string }
  | { kind: "skill"; name: string; minLevel: number | null }
  | { kind: "unmatched"; name: string }
  | { kind: "headcount"; count: number }
  | { kind: "hours"; hours: number }
  | { kind: "range"; from: string; to: string }
  | { kind: "from"; from: string }
  | { kind: "scope"; scope: "ALL" | "PROJECT" }
  | { kind: "office"; name: string };

/** Chip theo thứ tự đọc: việc → kỹ năng → số người, giờ → ngày → phạm vi, văn phòng. */
export function understoodChips(understood: Understood): UnderstoodChip[] {
  const chips: UnderstoodChip[] = [];
  if (understood.task) chips.push({ kind: "task", key: understood.task.key });
  else if (understood.workDescription) chips.push({ kind: "work", text: understood.workDescription });
  understood.skills.forEach((skill) => chips.push({ kind: "skill", name: skill.name, minLevel: skill.minLevel }));
  understood.unmatchedSkills.forEach((name) => chips.push({ kind: "unmatched", name }));
  if (understood.headcount != null) chips.push({ kind: "headcount", count: understood.headcount });
  if (understood.hours != null) chips.push({ kind: "hours", hours: understood.hours });
  if (understood.from && understood.to) chips.push({ kind: "range", from: understood.from, to: understood.to });
  else if (understood.from) chips.push({ kind: "from", from: understood.from });
  if (understood.scope && understood.intent === "FIND_PEOPLE") chips.push({ kind: "scope", scope: understood.scope });
  if (understood.officeName) chips.push({ kind: "office", name: understood.officeName });
  return chips;
}

/** Các lượt đã trả lời gần nhất, gửi kèm để hỏi nối tiếp ("thêm điều kiện ở Hà Nội"). */
export function historyFor(entries: AssistantEntry[], max = HISTORY_TURNS): AssistantTurn[] {
  return entries
    .filter((entry) => entry.status === "done" && entry.answer)
    .slice(-max)
    .map((entry) => ({ question: entry.question, understood: entry.answer!.understood }));
}

/** Giá trị đầu của form tạo việc từ "việc chưa tạo" trợ lý đã hiểu. */
export function taskFromWork(understood: Understood): TaskFormInitial {
  const description = understood.workDescription?.trim();
  return {
    title: description ? description.charAt(0).toUpperCase() + description.slice(1) : undefined,
    estimateMinutes: understood.hours != null ? understood.hours * 60 : null,
    startDate: understood.from,
    dueDate: understood.to,
    skills: understood.skills.map((skill) => ({ skillId: skill.skillId, minLevel: skill.minLevel })),
  };
}

/** Điều kiện mở sẵn hộp "Gợi ý người" cho việc có sẵn, đúng như trợ lý đã hiểu. */
export function criteriaForTask(understood: Understood): SuggestionInitialCriteria {
  return {
    skills: understood.skills.map((skill) => ({ skillId: skill.skillId, minLevel: skill.minLevel ?? 1 })),
    from: understood.from,
    to: understood.to,
    officeId: understood.officeId,
  };
}

/** Người hiện sẵn: theo số người câu hỏi cần (ít nhất 1), mặc định 5; bấm "Xem thêm" thì hiện hết. */
export function visibleCandidates(candidates: SuggestionCandidate[], headcount: number | null, expanded: boolean) {
  const limit = expanded ? candidates.length : Math.max(headcount ?? DEFAULT_SHOWN, 1);
  return { shown: candidates.slice(0, limit), hidden: Math.max(candidates.length - limit, 0) };
}
