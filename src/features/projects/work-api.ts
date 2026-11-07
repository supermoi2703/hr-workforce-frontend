import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  Candidate,
  Capacity,
  Comment,
  Metrics,
  MyWork,
  OrgTeam,
  Overview,
  Risk,
  SkillOption,
  Sprint,
  SprintCapacity,
  SprintInput,
  Suggestion,
  Task,
  TaskCard,
  TaskEvent,
  TaskInput,
  TaskStatus,
  Worklog,
  WorklogInput,
} from "./work-types";

const enc = encodeURIComponent;

// ===== Thành viên: tạm, tới khi có phân bổ có duyệt (3.4)

export const getCandidates = (projectId: string, sourceTeamId: string | null, sourceProjectId: string | null) =>
  http.get<Candidate[]>(`/api/projects/${enc(projectId)}/member-candidates`, {
    query: { sourceTeamId: sourceTeamId ?? undefined, sourceProjectId: sourceProjectId ?? undefined },
  });
export const addMembers = (projectId: string, employeeIds: string[], allocationPercent: number) =>
  http.post<number>(`/api/projects/${enc(projectId)}/members`, { employeeIds, allocationPercent });
export const updateMemberPercent = (projectId: string, employeeId: string, allocationPercent: number) =>
  http.put<void>(`/api/projects/${enc(projectId)}/members/${enc(employeeId)}`, { allocationPercent });
export const removeMember = (projectId: string, employeeId: string) =>
  http.delete<void>(`/api/projects/${enc(projectId)}/members/${enc(employeeId)}`);
export const getOrgTeams = () => http.get<OrgTeam[]>("/api/teams");
export const setSprintMode = (projectId: string, enabled: boolean) =>
  http.put<void>(`/api/projects/${enc(projectId)}/sprint-mode`, { enabled });

export const getOverview = (projectId: string) => http.get<Overview>(`/api/projects/${enc(projectId)}/overview`);
export const getRisks = (projectId: string) => http.get<Risk[]>(`/api/projects/${enc(projectId)}/risks`);
export const getCapacity = (projectId: string) => http.get<Capacity>(`/api/projects/${enc(projectId)}/capacity`);
export const getMetrics = (projectId: string) => http.get<Metrics>(`/api/projects/${enc(projectId)}/metrics`);

// ===== Việc

export const getTasks = (projectId: string, params: PageParams, filter: { status?: TaskStatus; assigneeId?: string; q?: string }) =>
  http.get<PageResponse<TaskCard>>(`/api/projects/${enc(projectId)}/tasks`, { query: { ...toPageQuery(params), ...filter } });
export const getBoard = (projectId: string, filter: { sprintId?: string; assigneeId?: string }) =>
  http.get<TaskCard[]>(`/api/projects/${enc(projectId)}/board`, { query: filter });
export const createTask = (projectId: string, body: TaskInput) => http.post<Task>(`/api/projects/${enc(projectId)}/tasks`, body);
export const getTask = (key: string) => http.get<Task>(`/api/tasks/by-key/${enc(key)}`);
export const updateTask = (id: string, body: TaskInput) => http.put<Task>(`/api/tasks/${enc(id)}`, body);
export const transitionTask = (id: string, to: TaskStatus, version: number) =>
  http.post<Task>(`/api/tasks/${enc(id)}/transitions`, { to, version });
export const assignTask = (id: string, assigneeId: string | null, version: number) =>
  http.post<Task>(`/api/tasks/${enc(id)}/assign`, { assigneeId, version });
export const moveTaskToSprint = (id: string, sprintId: string | null, version: number) =>
  http.post<Task>(`/api/tasks/${enc(id)}/sprint`, { sprintId, version });
export const deleteTask = (id: string) => http.delete<void>(`/api/tasks/${enc(id)}`);
export const getComments = (id: string) => http.get<Comment[]>(`/api/tasks/${enc(id)}/comments`);
export const addComment = (id: string, body: string) => http.post<Comment>(`/api/tasks/${enc(id)}/comments`, { body });
export const addLink = (id: string, targetKey: string, direction: "BLOCKS" | "BLOCKED_BY") =>
  http.post<void>(`/api/tasks/${enc(id)}/links`, { targetKey, direction });
export const removeLink = (id: string, linkId: string) => http.delete<void>(`/api/tasks/${enc(id)}/links/${enc(linkId)}`);
export const getEvents = (id: string) => http.get<TaskEvent[]>(`/api/tasks/${enc(id)}/events`);
export const getSuggestions = (id: string) => http.get<Suggestion[]>(`/api/tasks/${enc(id)}/assignee-suggestions`);
export const getMyWork = () => http.get<MyWork>("/api/my-work");
export const getSkillOptions = () => http.get<SkillOption[]>("/api/skills");

// ===== Giờ

export const getWorklogs = (taskId: string) => http.get<Worklog[]>(`/api/tasks/${enc(taskId)}/worklogs`);
export const addWorklog = (taskId: string, body: WorklogInput) => http.post<Worklog>(`/api/tasks/${enc(taskId)}/worklogs`, body);
export const deleteWorklog = (id: string) => http.delete<void>(`/api/worklogs/${enc(id)}`);

// ===== Sprint

export const getSprints = (projectId: string) => http.get<Sprint[]>(`/api/projects/${enc(projectId)}/sprints`);
export const createSprint = (projectId: string, body: SprintInput) => http.post<Sprint>(`/api/projects/${enc(projectId)}/sprints`, body);
export const startSprint = (id: string) => http.post<Sprint>(`/api/sprints/${enc(id)}/start`);
export const closeSprint = (id: string) => http.post<Sprint>(`/api/sprints/${enc(id)}/close`);
export const getSprintCapacity = (id: string) => http.get<SprintCapacity[]>(`/api/sprints/${enc(id)}/capacity`);
