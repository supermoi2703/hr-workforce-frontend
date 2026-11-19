import { http } from "@/lib/api/http-client";
import type { AskPolicyQaInput, PolicyQaAnswer, PolicyQaStatus } from "./types";

/**
 * Hỏi về chính sách (quyền ai:policy-qa). Lỗi: 503 FEATURE_DISABLED (tắt hoặc chưa có khóa), 503
 * AI_SERVICE_UNAVAILABLE (nhà cung cấp lỗi, hết hạn mức), 429 (hỏi quá nhanh, kèm Retry-After), 400 (câu hỏi rỗng hoặc
 * quá dài).
 */
export const askPolicyQa = (input: AskPolicyQaInput) => http.post<PolicyQaAnswer>("/api/ai/policy-qa", input);

/** Tính năng đang bật không, và tài liệu được tìm bằng cách nào. */
export const getPolicyQaStatus = () => http.get<PolicyQaStatus>("/api/ai/policy-qa/status");
