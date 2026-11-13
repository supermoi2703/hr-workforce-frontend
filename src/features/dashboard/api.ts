import { download, http } from "@/lib/api/http-client";
import type {
  DashboardBlock,
  HrDashboard,
  MyDashboard,
  ResourceDashboard,
  TeamDashboard,
  UnitRef,
} from "./types";

export type ResourceQuery = { officeId?: string; departmentId?: string; from: string; to: string };
export type HrQuery = { officeId?: string; departmentId?: string };

export const getBlocks = () =>
  http.get<{ blocks: DashboardBlock[] }>("/api/dashboard/blocks").then((response) => response.blocks);

export const getMyDashboard = () => http.get<MyDashboard>("/api/dashboard/me");

export const getTeamDashboard = () => http.get<TeamDashboard>("/api/dashboard/team");

export const getHrDashboard = (query: HrQuery) => http.get<HrDashboard>("/api/dashboard/hr", { query });

export const getResourceDashboard = (query: ResourceQuery) =>
  http.get<ResourceDashboard>("/api/dashboard/resources", { query });

export const downloadResourceExport = (query: ResourceQuery) => download("/api/dashboard/resources/export", { query });

// Danh mục cho bộ lọc (đơn vị đang dùng). Feature không import features khác nên tự gọi.
export const getOffices = () => http.get<UnitRef[]>("/api/offices");
export const getDepartments = () => http.get<UnitRef[]>("/api/departments");
