"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { getErrorMessage } from "./errors";

/**
 * Trả về hàm đổi lỗi API thành câu thông báo theo ngôn ngữ đang chọn:
 *
 *   const errorMessage = useErrorMessage();
 *   toast.error(errorMessage(error));
 *
 * Tách khỏi errors.ts để http-client (và test của nó) không phải nạp next-intl.
 */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations("Errors");
  return useCallback((error: unknown) => getErrorMessage(error, t), [t]);
}
