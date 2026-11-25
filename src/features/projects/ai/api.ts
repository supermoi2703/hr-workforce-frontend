import { http } from "@/lib/api/http-client";
import type { AssistantStatus, TaskProfile, TaskProfileInput } from "./types";

const enc = encodeURIComponent;

export const getAssistantStatus = () => http.get<AssistantStatus>("/api/allocation-assistant/status");

/**
 * Đoán nhóm công việc + kỹ năng từ tiêu đề, mô tả. Lỗi: 403 (không được tạo / sửa việc), 429 (gọi quá nhanh),
 * 503 FEATURE_DISABLED / AI_SERVICE_UNAVAILABLE. LLM lỗi thì backend vẫn trả kết quả `SEARCH_ONLY`, không báo lỗi.
 */
export const getTaskProfile = (projectId: string, input: TaskProfileInput) =>
  http.post<TaskProfile>(`/api/projects/${enc(projectId)}/ai/task-profile`, input);
