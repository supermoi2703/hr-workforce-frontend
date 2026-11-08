"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import type { PageParams } from "@/lib/api/types";
import { getProjects } from "./api";
import {
  getAllocationRequests,
  getAvailability,
  getBoard,
  getCandidates,
  getCapacity,
  getComments,
  getEvents,
  getMetrics,
  getMyWork,
  getOrgTeams,
  getOverview,
  getRisks,
  getSkillOptions,
  getSprintCapacity,
  getSprints,
  getSuggestions,
  getTask,
  getTasks,
  getWorklogs,
  type CandidateQuery,
} from "./work-api";
import { useProjectErrorMessage } from "./hooks";
import type { TaskStatus } from "./work-types";

// Board và cảnh báo tự tải lại để nhiều người cùng xem thấy thay đổi gần như ngay (đặc tả mục 10).
const BOARD_POLL_MS = 3_000;
const INSIGHT_POLL_MS = 5_000;

// Cùng gốc "projects" với hooks.ts để thao tác ghi làm mới cả hai phần.
const key = (...parts: unknown[]) => ["projects", "work", ...parts];

export const useOverview = (projectId: string) =>
  useQuery({ queryKey: key("overview", projectId), queryFn: () => getOverview(projectId), refetchInterval: INSIGHT_POLL_MS });
export const useRisks = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: key("risks", projectId), queryFn: () => getRisks(projectId), enabled, refetchInterval: INSIGHT_POLL_MS });
export const useCapacity = (projectId: string) => useQuery({ queryKey: key("capacity", projectId), queryFn: () => getCapacity(projectId) });
export const useMetrics = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: key("metrics", projectId), queryFn: () => getMetrics(projectId), enabled });
export const useTasks = (projectId: string, params: PageParams, filter: { status?: TaskStatus; assigneeId?: string; q?: string }) =>
  useQuery({ queryKey: key("tasks", projectId, params, filter), queryFn: () => getTasks(projectId, params, filter) });
export const useBoard = (projectId: string, filter: { sprintId?: string; assigneeId?: string }) =>
  useQuery({
    queryKey: key("board", projectId, filter),
    queryFn: () => getBoard(projectId, filter),
    refetchInterval: BOARD_POLL_MS,
    refetchIntervalInBackground: false,
  });
export const useTask = (taskKey: string | null) =>
  useQuery({ queryKey: key("task", taskKey), queryFn: () => getTask(taskKey!), enabled: !!taskKey, retry: false });
export const useComments = (id: string | undefined) =>
  useQuery({ queryKey: key("comments", id), queryFn: () => getComments(id!), enabled: !!id });
export const useEvents = (id: string | undefined) => useQuery({ queryKey: key("events", id), queryFn: () => getEvents(id!), enabled: !!id });
export const useWorklogs = (id: string | undefined) =>
  useQuery({ queryKey: key("worklogs", id), queryFn: () => getWorklogs(id!), enabled: !!id });
export const useSuggestions = (id: string | null) =>
  useQuery({ queryKey: key("suggestions", id), queryFn: () => getSuggestions(id!), enabled: !!id });
export const useMyWork = () => useQuery({ queryKey: key("my-work"), queryFn: getMyWork, retry: false });
export const useSkillOptions = () => useQuery({ queryKey: key("skills"), queryFn: getSkillOptions, staleTime: 300_000 });
export const useSprints = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: key("sprints", projectId), queryFn: () => getSprints(projectId), enabled });
export const useSprintCapacity = (id: string | undefined) =>
  useQuery({ queryKey: key("sprint-capacity", id), queryFn: () => getSprintCapacity(id!), enabled: !!id });

export const useCandidates = (projectId: string, query: CandidateQuery) =>
  useQuery({
    queryKey: key("candidates", projectId, query),
    queryFn: () => getCandidates(projectId, query),
    enabled: !!query.sourceTeamId || !!query.sourceProjectId,
  });
/** Đề xuất phân bổ của dự án; chỉ người xem được % phân bổ mới gọi được. */
export const useAllocationRequests = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: key("allocation-requests", projectId), queryFn: () => getAllocationRequests(projectId), enabled });
export const useAvailability = (projectId: string, employeeId: string | null, from: string | null, to: string | null) =>
  useQuery({
    queryKey: key("availability", projectId, employeeId, from, to),
    queryFn: () => getAvailability(projectId, employeeId!, from!, to),
    enabled: !!employeeId && !!from,
    retry: false,
  });
export const useOrgTeams = (enabled: boolean) => useQuery({ queryKey: key("org-teams"), queryFn: getOrgTeams, enabled });
export const useSourceProjects = (enabled: boolean) =>
  useQuery({ queryKey: key("source-projects"), queryFn: () => getProjects({}, { page: 0, size: 100 }), enabled });

/** Mọi thao tác ghi: xong thì tải lại toàn bộ dữ liệu dự án vì số liệu liên quan chéo nhau. */
export function useWorkMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: ["projects"] }) });
}

type ErrorKey = keyof Messages["ProjectWork"]["Errors"];
const ERROR_KEYS: readonly string[] = [
  "PROJECT_MEMBER_INVALID",
  "PROJECT_HAS_OPEN_TASKS",
  "TASK_NOT_FOUND",
  "TASK_INVALID_PARENT",
  "TASK_LINK_INVALID",
  "TASK_LINK_CYCLE",
  "TASK_HAS_WORKLOG",
  "TASK_NOT_DELETABLE",
  "SPRINT_DISABLED",
  "SPRINT_ALREADY_ACTIVE",
  "SPRINT_INVALID_STATE",
  "WORKLOG_DAY_NOT_ALLOWED",
  "WORKLOG_STEP",
  "WORKLOG_DAY_LIMIT",
  "WORKLOG_NOT_MEMBER_ON_DAY",
  "WORKLOG_TASK_CLOSED",
];

export function useWorkErrorMessage() {
  const t = useTranslations("ProjectWork.Errors");
  const fallback = useProjectErrorMessage();
  return useCallback(
    (error: unknown) => (isApiError(error) && ERROR_KEYS.includes(error.code) ? t(error.code as ErrorKey) : fallback(error)),
    [t, fallback],
  );
}
