"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import type { PageParams } from "@/lib/api/types";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  getBoard,
  getCapacity,
  getComments,
  getEvents,
  getMembers,
  getMetrics,
  getMyWork,
  getOverview,
  getProject,
  getProjects,
  getRisks,
  getSkillOptions,
  getSprintCapacity,
  getSprints,
  getSuggestions,
  getTask,
  getTasks,
  getWorkTeam,
  getWorkTeams,
  getWorklogs,
  searchPeople,
} from "./api";
import type { TaskStatus } from "./types";

// Board và cảnh báo tự tải lại để nhiều người cùng xem thấy thay đổi gần như ngay (đặc tả mục 10).
const BOARD_POLL_MS = 3_000;
const INSIGHT_POLL_MS = 5_000;

const projectKeys = { all: ["projects"] as const };
const key = (...parts: unknown[]) => [...projectKeys.all, ...parts];

export const useProjects = (params: PageParams) =>
  useQuery({ queryKey: key("list", params), queryFn: () => getProjects(params) });
export const useProject = (code: string) => useQuery({ queryKey: key("detail", code), queryFn: () => getProject(code), retry: false });
export const useMembers = (projectId: string) => useQuery({ queryKey: key("members", projectId), queryFn: () => getMembers(projectId) });
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
export const useWorkTeams = () => useQuery({ queryKey: key("work-teams"), queryFn: getWorkTeams });
export const useWorkTeam = (id: string | null) =>
  useQuery({ queryKey: key("work-team", id), queryFn: () => getWorkTeam(id!), enabled: !!id });
export const usePeopleSearch = (q: string) =>
  useQuery({ queryKey: key("people", q), queryFn: () => searchPeople(q), enabled: q.trim().length >= 2 });

/** Mọi thao tác ghi: xong thì tải lại toàn bộ dữ liệu dự án vì số liệu liên quan chéo nhau. */
export function useProjectMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }) });
}

type ErrorKey = keyof Messages["Projects"]["Errors"];
const ERROR_KEYS: readonly string[] = [
  "PROJECT_NOT_FOUND",
  "PROJECT_CODE_EXISTS",
  "PROJECT_CLOSED",
  "PROJECT_MEMBER_INVALID",
  "PROJECT_PM_REMOVAL",
  "STALE_VERSION",
  "WORK_TEAM_NOT_FOUND",
  "WORK_TEAM_CODE_EXISTS",
  "TASK_NOT_FOUND",
  "TASK_INVALID_PARENT",
  "TASK_LINK_INVALID",
  "TASK_LINK_CYCLE",
  "TASK_HAS_WORKLOG",
  "SPRINT_DISABLED",
  "SPRINT_ALREADY_ACTIVE",
  "SPRINT_INVALID_STATE",
  "WORKLOG_DAY_NOT_ALLOWED",
  "WORKLOG_STEP",
];

export function useProjectErrorMessage() {
  const t = useTranslations("Projects.Errors");
  const fallback = useErrorMessage();
  return useCallback(
    (error: unknown) => (isApiError(error) && ERROR_KEYS.includes(error.code) ? t(error.code as ErrorKey) : fallback(error)),
    [t, fallback],
  );
}
