import { z } from "zod";
import { todayIsoDate } from "@/lib/format";
import type { PerformanceRate } from "./types";

export const PERFORMANCE_RATE_LEVELS = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;

export function performanceRateSchema(t: (key: "invalidAmount" | "invalidDate" | "selectLevel") => string) {
  return z.object({
    level: z.enum(PERFORMANCE_RATE_LEVELS, { error: t("selectLevel") }),
    positionId: z.string(),
    amount: z.string().trim().regex(/^\d{1,15}$/, t("invalidAmount")).transform(Number),
    effectiveFrom: z.iso.date(t("invalidDate")),
  });
}

export function canDeletePerformanceRate(rate: PerformanceRate, today = todayIsoDate()) {
  return rate.effectiveFrom > today;
}
