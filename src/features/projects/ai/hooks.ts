"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useWorkErrorMessage } from "../work-hooks";
import { askAssistant, getAssistantStatus, getTaskProfile } from "./api";
import { historyFor } from "./assistant-rules";
import type { AssistantEntry, AssistantTurn, TaskProfileInput } from "./types";

/** Trợ lý đang bật không. Lỗi khi hỏi trạng thái thì coi như tắt (ẩn nút), không báo lỗi. */
export function useAssistantStatus() {
  const query = useQuery({
    queryKey: ["allocation-assistant", "status"],
    queryFn: getAssistantStatus,
    staleTime: 60_000,
    retry: false,
  });
  return query.data?.enabled === true;
}

/** Không lưu vào cache của React Query: backend đã giữ kết quả theo nội dung việc, gọi lại không tốn hạn mức. */
export const useTaskProfile = (projectId: string) =>
  useMutation({ mutationFn: (input: TaskProfileInput) => getTaskProfile(projectId, input) });

const AI_ERRORS = { FEATURE_DISABLED: "disabled", AI_SERVICE_UNAVAILABLE: "unavailable" } as const;

/** Lỗi riêng của trợ lý (tắt, không gọi được AI); còn lại như các thao tác khác của dự án (429 dùng câu chung). */
export function useAiErrorMessage() {
  const t = useTranslations("AllocationAi.errors");
  const fallback = useWorkErrorMessage();
  return useCallback(
    (error: unknown) => {
      if (isApiError(error) && error.code in AI_ERRORS) return t(AI_ERRORS[error.code as keyof typeof AI_ERRORS]);
      return fallback(error);
    },
    [t, fallback],
  );
}

/**
 * Hội thoại với trợ lý phân bổ của một dự án. State nằm ở trang dự án nên đóng / mở lại bảng vẫn giữ các lượt. Mỗi
 * câu hỏi gửi kèm điều kiện 2 lượt trả lời gần nhất để hỏi nối tiếp.
 */
export function useAssistantConversation(projectId: string) {
  const [entries, setEntries] = useState<AssistantEntry[]>([]);
  const nextId = useRef(1);
  const pending = entries.some((entry) => entry.status === "pending");

  const run = useCallback(
    (id: number, question: string, taskId: string | null, history: AssistantTurn[]) => {
      askAssistant(projectId, { question, taskId, history }).then(
        (answer) => setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, status: "done", answer } : entry))),
        (error: unknown) => setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, status: "error", error } : entry))),
      );
    },
    [projectId],
  );

  const ask = useCallback(
    (question: string, taskId: string | null) => {
      const id = nextId.current++;
      const history = historyFor(entries);
      setEntries((list) => [...list, { id, question, taskId, status: "pending" }]);
      run(id, question, taskId, history);
    },
    [entries, run],
  );

  const retry = useCallback(
    (id: number) => {
      const entry = entries.find((item) => item.id === id);
      if (!entry) return;
      const history = historyFor(entries.slice(0, entries.indexOf(entry)));
      setEntries((list) => list.map((item) => (item.id === id ? { ...item, status: "pending", error: undefined } : item)));
      run(id, entry.question, entry.taskId, history);
    },
    [entries, run],
  );

  const clear = useCallback(() => setEntries([]), []);
  return { entries, pending, ask, retry, clear };
}
