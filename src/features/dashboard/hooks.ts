"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getBlocks,
  getDepartments,
  getHrDashboard,
  getMyDashboard,
  getOffices,
  getResourceDashboard,
  getTeamDashboard,
  type HrQuery,
  type ResourceQuery,
} from "./api";
import { filtersFromSearchParams, filtersToSearchParams } from "./rules";
import type { DashboardFilters } from "./types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  blocks: () => [...dashboardKeys.all, "blocks"] as const,
  me: () => [...dashboardKeys.all, "me"] as const,
  team: () => [...dashboardKeys.all, "team"] as const,
  hr: (query: HrQuery) => [...dashboardKeys.all, "hr", query] as const,
  resources: (query: ResourceQuery) => [...dashboardKeys.all, "resources", query] as const,
  offices: () => [...dashboardKeys.all, "offices"] as const,
  departments: () => [...dashboardKeys.all, "departments"] as const,
};

/** Số liệu tổng hợp đổi chậm: không cần tải lại mỗi lần quay lại tab. */
const STALE = 60_000;

export const useDashboardBlocks = () =>
  useQuery({ queryKey: dashboardKeys.blocks(), queryFn: getBlocks, staleTime: 5 * 60_000 });

export const useMyDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.me(), queryFn: getMyDashboard, staleTime: STALE, enabled });

export const useTeamDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.team(), queryFn: getTeamDashboard, staleTime: STALE, enabled });

// Đổi bộ lọc thì giữ số liệu cũ tới khi có số mới (không nháy khung đang tải).
export const useHrDashboard = (query: HrQuery, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.hr(query),
    queryFn: () => getHrDashboard(query),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });

export const useResourceDashboard = (query: ResourceQuery, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.resources(query),
    queryFn: () => getResourceDashboard(query),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });

export const useOffices = (enabled: boolean) =>
  useQuery({ queryKey: dashboardKeys.offices(), queryFn: getOffices, staleTime: 5 * 60_000, enabled });

export const useDepartments = (enabled: boolean) =>
  useQuery({ queryKey: dashboardKeys.departments(), queryFn: getDepartments, staleTime: 5 * 60_000, enabled });

/** Bộ lọc của trang nằm trên URL (chia sẻ link, F5 không mất). */
export function useDashboardFilters(): [DashboardFilters, (next: DashboardFilters) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromSearchParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const setFilters = useCallback(
    (next: DashboardFilters) => {
      const query = filtersToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  return [filters, setFilters];
}
