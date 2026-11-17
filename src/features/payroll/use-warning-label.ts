"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { LEGACY_WARNING, warningParams } from "./warnings";

type WarningLike = { code: string; params?: Record<string, unknown> | null; text?: string | null };

/** Nhãn dịch của một mã cảnh báo: LEGACY hiện nguyên văn, mã lạ hiện chính mã. */
export function useWarningLabel() {
  const t = useTranslations("Payroll.warnings");
  return useCallback(
    (warning: WarningLike) => {
      if (warning.code === LEGACY_WARNING) return warning.text ?? warning.code;
      const key = warning.code as Parameters<typeof t>[0];
      return t.has(key) ? t(key, warningParams(warning.params)) : warning.code;
    },
    [t],
  );
}
