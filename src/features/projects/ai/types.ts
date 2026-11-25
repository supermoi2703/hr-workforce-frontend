import type { AssigneeSuggestions, Person, TeamLoad, WorkPhase } from "../work-types";

/** Trạng thái trợ lý phân bổ AI (backend README module project mục 7.6): tắt hoặc chưa có khoá thì ẩn nút AI. */
export type AssistantStatus = { enabled: boolean; mode: "HYBRID" | "KEYWORD_ONLY" };

export type TaskProfileInput = { title: string; description: string | null };

/** AI: LLM chọn trong danh mục. SEARCH_ONLY: LLM lỗi, kết quả chỉ từ tìm theo nghĩa / từ khoá. */
export type ProfileSource = "AI" | "SEARCH_ONLY";

/** Gợi ý nhóm công việc + kỹ năng cho form việc. Mọi mục đều có trong danh mục đang dùng. */
export type TaskProfile = {
  category: { id: string; name: string; phase: WorkPhase; defaultMinutes: number } | null;
  skills: { skillId: string; name: string; minLevel: number | null }[];
  source: ProfileSource;
  mode: AssistantStatus["mode"];
};

// ===== Phần B: trợ lý hỏi bằng câu (backend README module project mục 7.6)

export type AssistantIntent = "FIND_PEOPLE" | "TEAM_AVAILABILITY" | "PROJECT_RISK" | "UNSUPPORTED";
export type AnswerKind = "PEOPLE" | "TEAM" | "RISKS" | "CLARIFY" | "UNSUPPORTED";
export const ASSISTANT_NOTES = [
  "TASK_NOT_FOUND",
  "RANGE_CLAMPED",
  "DATE_IGNORED",
  "SKILL_NOT_IN_CATALOG",
  "OFFICE_NOT_FOUND",
  "SKILLS_FROM_DESCRIPTION",
] as const;
export type AssistantNote = (typeof ASSISTANT_NOTES)[number];
export const RISK_CODES = ["OVERDUE", "ASSIGNEE_RED", "ASSIGNEE_YELLOW", "UNASSIGNED_STARTING"] as const;
export type RiskCode = (typeof RISK_CODES)[number];

/** Điều kiện trợ lý đã hiểu (server đã kiểm và đổi sang mã trong hệ thống); hiện thành chip. */
export type Understood = {
  intent: AssistantIntent;
  task: { id: string; key: string } | null;
  virtualWork: boolean;
  workDescription: string | null;
  skills: { skillId: string; name: string; minLevel: number | null }[];
  unmatchedSkills: string[];
  headcount: number | null;
  hours: number | null;
  scope: "ALL" | "PROJECT" | null;
  officeId: string | null;
  officeName: string | null;
  from: string | null;
  to: string | null;
};

export type AssistantRisk = {
  taskId: string;
  key: string;
  title: string;
  assignee: Person | null;
  start: string | null;
  end: string | null;
  codes: RiskCode[];
};

export type AssistantAnswer = {
  kind: AnswerKind;
  understood: Understood;
  notes: string[];
  people: AssigneeSuggestions | null;
  team: TeamLoad | null;
  risks: AssistantRisk[] | null;
};

export type AssistantTurn = { question: string; understood: Understood };
export type AssistantInput = { question: string; taskId: string | null; history: AssistantTurn[] };

/** Một lượt hỏi trên bảng trợ lý. */
export type AssistantEntry = {
  id: number;
  question: string;
  taskId: string | null;
  status: "pending" | "done" | "error";
  answer?: AssistantAnswer;
  error?: unknown;
};
