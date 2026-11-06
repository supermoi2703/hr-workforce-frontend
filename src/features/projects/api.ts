import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  Capacity,
  Comment,
  Members,
  Metrics,
  MyWork,
  Overview,
  Person,
  Project,
  ProjectInput,
  ProjectListItem,
  ProjectRole,
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
  WorkTeam,
  WorkTeamDetail,
  WorkTeamInput,
  Worklog,
  WorklogInput,
} from "./types";

const enc = encodeURIComponent;

// ===== Đội

export const getWorkTeams = () => http.get<WorkTeam[]>("/api/work-teams");
export const getWorkTeam = (id: string) => http.get<WorkTeamDetail>(`/api/work-teams/${enc(id)}`);
export const createWorkTeam = (body: WorkTeamInput) => http.post<WorkTeamDetail>("/api/work-teams", body);
export const updateWorkTeam = (id: string, body: WorkTeamInput) => http.put<WorkTeamDetail>(`/api/work-teams/${enc(id)}`, body);
export const addTeamMember = (id: string, employeeId: string) =>
  http.put<WorkTeamDetail>(`/api/work-teams/${enc(id)}/members/${enc(employeeId)}`);
export const removeTeamMember = (id: string, employeeId: string) =>
  http.delete<WorkTeamDetail>(`/api/work-teams/${enc(id)}/members/${enc(employeeId)}`);

// ===== Dự án

export const getProjects = (params: PageParams) =>
  http.get<PageResponse<ProjectListItem>>("/api/projects", { query: toPageQuery(params) });
export const searchPeople = (q: string) => http.get<Person[]>("/api/projects/people", { query: { q } });
export const getProject = (code: string) => http.get<Project>(`/api/projects/by-code/${enc(code)}`);
export const createProject = (body: ProjectInput & { code: string }) => http.post<Project>("/api/projects", body);
export const updateProject = (id: string, body: ProjectInput & { version: number }) =>
  http.put<Project>(`/api/projects/${enc(id)}`, body);
export const setProjectClosed = (id: string, closed: boolean) =>
  http.post<Project>(`/api/projects/${enc(id)}/${closed ? "close" : "reopen"}`);

export const getMembers = (projectId: string) => http.get<Members>(`/api/projects/${enc(projectId)}/members`);
export const addMember = (projectId: string, body: { employeeId: string; role: ProjectRole; allocationPercent: number }) =>
  http.post<Members>(`/api/projects/${enc(projectId)}/members`, body);
export const updateMember = (projectId: string, employeeId: string, body: { role: ProjectRole; allocationPercent: number }) =>
  http.put<Members>(`/api/projects/${enc(projectId)}/members/${enc(employeeId)}`, body);
export const removeMember = (projectId: string, employeeId: string) =>
  http.delete<Members>(`/api/projects/${enc(projectId)}/members/${enc(employeeId)}`);
export const attachTeam = (projectId: string, workTeamId: string) =>
  http.post<Members>(`/api/projects/${enc(projectId)}/teams`, { workTeamId });
export const syncTeam = (projectId: string, workTeamId: string) =>
  http.post<Members>(`/api/projects/${enc(projectId)}/teams/${enc(workTeamId)}/sync`);
export const detachTeam = (projectId: string, workTeamId: string) =>
  http.delete<Members>(`/api/projects/${enc(projectId)}/teams/${enc(workTeamId)}`);

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
