/** Kiểu dữ liệu của trợ lý hỏi đáp chính sách (backend modules/ai, `PolicyQaDtos`). */

/** Một lượt hỏi đáp trước đó gửi kèm để hiểu câu hỏi nối tiếp. */
export type PolicyQaTurn = { question: string; answer: string };

export type AskPolicyQaInput = { question: string; history: PolicyQaTurn[] };

/** Đoạn tài liệu làm căn cứ. `excerpt` là nội dung Markdown của đoạn. */
export type PolicyQaSource = { id: string; file: string; section: string; excerpt: string };

/** Giá trị tham số đang có hiệu lực; `nextValue` / `nextFrom` khi HR đã lên lịch đổi. */
export type PolicyQaParameter = {
  key: string;
  value: string;
  nextValue: string | null;
  /** Ngày hiệu lực của giá trị sắp tới, "yyyy-MM-dd". */
  nextFrom: string | null;
};

/** `answered` = false: tài liệu không có câu trả lời (frontend hiện câu "chưa quy định" theo ngôn ngữ giao diện). */
export type PolicyQaAnswer = {
  answered: boolean;
  /** Markdown; rỗng khi `answered` = false. */
  answer: string;
  sources: PolicyQaSource[];
  parameters: PolicyQaParameter[];
  latencyMs: number;
};

export type PolicyQaMode = "HYBRID" | "KEYWORD_ONLY" | "NOT_READY";

export type PolicyQaStatus = {
  enabled: boolean;
  mode: PolicyQaMode;
  documents: number;
  chunks: number;
  chatModel: string;
  embeddingModel: string | null;
};

/** Một mục trong cuộc hỏi đáp đang hiển thị (chỉ giữ trong bộ nhớ trang, không lưu ở đâu). */
export type PolicyQaEntry = {
  id: string;
  question: string;
  state: "pending" | "done" | "error";
  answer?: PolicyQaAnswer;
  error?: unknown;
};
