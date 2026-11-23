"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import {
  acceptOvertime,
  assignOvertime,
  cancelOvertime,
  claimOvertime,
  declineOvertime,
  getClaimDraft,
  getMyOvertime,
  getOffices,
  getOvertimeUsage,
  getProjectOvertime,
  listOvertime,
} from "./api";
import { getOvertimeError, isStaleOvertimeError } from "./error-messages";
import { formatDuration } from "./rules";
import type { AssignOvertimeInput, ClaimOvertimeInput, OvertimeListFilters } from "./types";

export const OVERTIME_READ_PERMISSION = "overtime:read";

export const overtimeKeys = {
  all: ["overtime"] as const,
  mine: (month: string) => ["overtime", "me", month] as const,
  project: (projectId: string, month: string) => ["overtime", "project", projectId, month] as const,
  list: (filters: OvertimeListFilters, params: PageParams) => ["overtime", "list", filters, params] as const,
  usage: (employeeId: string, date: string) => ["overtime", "usage", employeeId, date] as const,
  draft: (date: string) => ["overtime", "claim-draft", date] as const,
  offices: ["overtime", "offices"] as const,
};

export function useMyOvertime(month: string) {
  return useQuery({ queryKey: overtimeKeys.mine(month), queryFn: () => getMyOvertime(month), placeholderData: keepPreviousData });
}

export function useProjectOvertime(projectId: string, month: string) {
  return useQuery({
    queryKey: overtimeKeys.project(projectId, month),
    queryFn: () => getProjectOvertime(projectId, month),
    placeholderData: keepPreviousData,
  });
}

export function useOvertimeList(filters: OvertimeListFilters, params: PageParams) {
  return useQuery({
    queryKey: overtimeKeys.list(filters, params),
    queryFn: () => listOvertime(filters, params),
    enabled: !!filters.month,
    placeholderData: keepPreviousData,
  });
}

/** Mức đã dùng / trần của một người cho ngày đang chọn; chỉ gọi khi đủ người và ngày. */
export function useOvertimeUsage(employeeId: string | null | undefined, date: string) {
  return useQuery({
    queryKey: overtimeKeys.usage(employeeId ?? "", date),
    queryFn: () => getOvertimeUsage(employeeId!, date),
    enabled: !!employeeId && /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 0,
  });
}

export function useClaimDraft(date: string) {
  return useQuery({
    queryKey: overtimeKeys.draft(date),
    queryFn: () => getClaimDraft(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 0,
  });
}

export function useOffices() {
  return useQuery({ queryKey: overtimeKeys.offices, queryFn: getOffices, staleTime: 5 * 60_000 });
}

/**
 * Mọi thao tác làm đổi danh sách OT, mức đã dùng, và cả hộp "Việc cần duyệt" (phiếu khai đi qua module Phê duyệt):
 * làm mới các query OT; lỗi "dữ liệu đã cũ" cũng làm mới để thấy trạng thái thật.
 */
function useOvertimeMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      if (isStaleOvertimeError(error)) void queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
    },
  });
}

export const useAssignOvertime = () => useOvertimeMutation((body: AssignOvertimeInput) => assignOvertime(body));
export const useClaimOvertime = () => useOvertimeMutation((body: ClaimOvertimeInput) => claimOvertime(body));
export const useAcceptOvertime = () => useOvertimeMutation((id: string) => acceptOvertime(id));
export const useDeclineOvertime = () =>
  useOvertimeMutation(({ id, reason }: { id: string; reason: string }) => declineOvertime(id, reason));
export const useCancelOvertime = () =>
  useOvertimeMutation(({ id, reason }: { id: string; reason: string }) => cancelOvertime(id, reason));

/** Lỗi API thành câu theo ngôn ngữ đang chọn, ưu tiên câu riêng của mã OVERTIME_*. */
export function useOvertimeErrorMessage() {
  const t = useTranslations("Overtime.errors");
  const tErrors = useTranslations("Errors");
  return useCallback((error: unknown) => getOvertimeError(error, t, tErrors), [t, tErrors]);
}

/** Số phút thành "2 giờ 45" theo ngôn ngữ đang chọn. */
export function useDuration() {
  const t = useTranslations("Overtime.duration");
  return useCallback((minutes: number | null | undefined) => formatDuration(minutes, t), [t]);
}
