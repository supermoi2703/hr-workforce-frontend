"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { getMyKpi, getOffices, getPeriod, getPeriods, getRatingQueue, getReview, getReviewPage, getTeamReviews, runKpiAction } from "./api";
import { kpiErrorKeys, MONTH_PATTERN } from "./rules";
import type { ReviewFilters } from "./types";

export const useKpiRatings = (month: string) =>
  useQuery({ queryKey: ["kpi", "ratings", month], queryFn: () => getRatingQueue(month), enabled: MONTH_PATTERN.test(month) });
export const useKpiTeam = (month: string) =>
  useQuery({ queryKey: ["kpi", "team", month], queryFn: () => getTeamReviews(month), enabled: MONTH_PATTERN.test(month) });
export const useMyKpi = (month: string) =>
  useQuery({ queryKey: ["kpi", "me", month], queryFn: () => getMyKpi(month), enabled: MONTH_PATTERN.test(month) });
export const useKpiReview = (id: string) =>
  useQuery({ queryKey: ["kpi", "review", id], queryFn: () => getReview(id) });
export const useKpiPeriods = (year: string) =>
  useQuery({ queryKey: ["kpi", "periods", year], queryFn: () => getPeriods(year), enabled: Boolean(year) });
export const useKpiPeriod = (month: string, exists: boolean) =>
  useQuery({ queryKey: ["kpi", "period", month], queryFn: () => getPeriod(month), enabled: exists });
export const useKpiReviewPage = (month: string, page: number, filters: ReviewFilters, exists: boolean) =>
  useQuery({
    queryKey: ["kpi", "reviewPage", month, page, filters],
    queryFn: () => getReviewPage(month, page, filters),
    enabled: exists,
  });
export const useKpiOffices = () => useQuery({ queryKey: ["kpi", "offices"], queryFn: getOffices });

export function useKpiError() {
  const t = useTranslations("Kpi.errors");
  const fallback = useErrorMessage();
  return (error: unknown) => {
    const key = isApiError(error) ? kpiErrorKeys[error.code] : undefined;
    return key ? t(key) : fallback(error);
  };
}

export function useKpiMutation() {
  const t = useTranslations("Kpi");
  const client = useQueryClient();
  const errorMessage = useKpiError();
  return useMutation({
    mutationFn: runKpiAction,
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ["kpi"] });
      toast.success(t(`success.${action.type}`));
    },
    onError: async (error) => {
      toast.error(errorMessage(error));
      if (isApiError(error) && [403, 404, 409].includes(error.status)) {
        await client.invalidateQueries({ queryKey: ["kpi"] });
      }
    },
  });
}
