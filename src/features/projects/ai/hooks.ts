"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useWorkErrorMessage } from "../work-hooks";
import { getAssistantStatus, getTaskProfile } from "./api";
import type { TaskProfileInput } from "./types";

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
