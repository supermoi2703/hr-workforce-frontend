import type { Messages } from "next-intl";
import type { PeriodStatus } from "./types";

export const MONTH_PATTERN = /^(20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/;

export function initialKpiMonth(value: string | string[] | undefined, currentMonth: string): string {
  return typeof value === "string" && MONTH_PATTERN.test(value) ? value : currentMonth;
}

export function nextPeriodStatus(status: PeriodStatus) {
  switch (status) {
    case "OPEN": return "RATING";
    case "RATING": return "REVIEW";
    case "REVIEW": return "LOCKED";
    case "LOCKED": return null;
  }
}

export function parseCoefficient(value: string, cap: number): number | undefined {
  const input = value.trim();
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(input)) return undefined;
  const coefficient = Number(input.replace(",", "."));
  return coefficient <= cap ? coefficient : undefined;
}

type ErrorKey = keyof Messages["Kpi"]["errors"];

export const kpiErrorKeys: Partial<Record<string, ErrorKey>> = {
  KPI_PERIOD_NOT_FOUND: "periodNotFound",
  KPI_REVIEW_NOT_FOUND: "reviewNotFound",
  KPI_FUTURE_MONTH: "futureMonth",
  KPI_PERIOD_INVALID_TRANSITION: "invalidTransition",
  KPI_PERIOD_LOCKED: "periodLocked",
  KPI_RATING_NOT_OPEN: "ratingNotOpen",
  KPI_REVIEW_NOT_OPEN: "reviewNotOpen",
  KPI_NOT_PROJECT_MANAGER: "notProjectManager",
  KPI_SELF_RATING: "selfRating",
  KPI_NOT_RATABLE: "notRatable",
  KPI_REVIEW_LOCKED: "reviewLocked",
  KPI_REVIEW_NOT_LOCKED: "reviewNotLocked",
  KPI_NOT_DIRECT_MANAGER: "notDirectManager",
  KPI_SELF_REVIEW: "selfReview",
  KPI_ADJUST_REASON_REQUIRED: "adjustReasonRequired",
  KPI_ADJUST_OUT_OF_RANGE: "adjustOutOfRange",
  KPI_TIMESHEET_NOT_LOCKED: "timesheetNotLocked",
  KPI_UNLOCK_REASON_REQUIRED: "unlockReasonRequired",
  KPI_PAYROLL_SUBMITTED: "payrollSubmitted",
  MALFORMED_REQUEST: "malformed",
  INVALID_PERIOD: "invalidPeriod",
};
