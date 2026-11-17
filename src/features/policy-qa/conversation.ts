import type { PolicyQaEntry, PolicyQaTurn } from "./types";

/** Khớp backend (`app.ai.policy-qa.max-question-length`, mặc định 500). Backend vẫn kiểm tra lại. */
export const MAX_QUESTION_LENGTH = 500;

/** Số lượt gần nhất gửi kèm để hiểu câu hỏi nối tiếp (backend cũng chỉ giữ chừng này). */
export const HISTORY_TURNS = 3;

/** Câu hỏi hợp lệ để gửi: có chữ, không quá dài. */
export function isValidQuestion(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_QUESTION_LENGTH;
}

/**
 * Lịch sử gửi kèm: các lượt gần nhất ĐÃ được trả lời. Câu bị từ chối, đang chờ hoặc lỗi không có câu trả lời để nhớ nên
 * bỏ qua.
 */
export function toHistory(entries: PolicyQaEntry[], turns: number = HISTORY_TURNS): PolicyQaTurn[] {
  return entries
    .filter((entry) => entry.state === "done" && entry.answer?.answered)
    .slice(-turns)
    .map((entry) => ({ question: entry.question, answer: entry.answer?.answer ?? "" }));
}

/** "true"/"false" của tham số kiểu BOOLEAN; mọi giá trị khác giữ nguyên (số, giờ, khoảng thời gian ISO). */
export function booleanOf(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
