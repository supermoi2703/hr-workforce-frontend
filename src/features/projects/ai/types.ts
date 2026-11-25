import type { WorkPhase } from "../work-types";

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
