"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import {
  getOrgDepartments,
  getOrgOffices,
  getProjectByCode,
  getProjectCreateScope,
  getProjectMembers,
  getProjects,
  searchEmployeeOptions,
} from "./api";
import { getProjectError, isStaleProjectError } from "./error-messages";
import { filtersFromSearchParams, filtersToSearchParams } from "./rules";
import type { ProjectFilters } from "./types";

// Phòng ban, văn phòng, phạm vi tạo dự án ít đổi: giữ 5 phút.
const SLOW_STALE_TIME = 5 * 60_000;

export const projectKeys = {
  all: ["projects"] as const,
  list: (filters: ProjectFilters, params: PageParams) => ["projects", "list", filters, params] as const,
  detail: (code: string) => ["projects", "detail", code.toUpperCase()] as const,
  members: (id: string, date: string | undefined) => ["projects", "members", id, date ?? "current"] as const,
  createScope: ["projects", "create-scope"] as const,
  departments: ["projects", "departments"] as const,
  offices: ["projects", "offices"] as const,
  employees: (keyword: string) => ["projects", "employees", keyword] as const,
};

export function useProjects(filters: ProjectFilters, params: PageParams) {
  return useQuery({
    queryKey: projectKeys.list(filters, params),
    queryFn: () => getProjects(filters, params),
    placeholderData: keepPreviousData,
  });
}

export function useProject(code: string) {
  return useQuery({ queryKey: projectKeys.detail(code), queryFn: () => getProjectByCode(code) });
}

export function useProjectMembers(id: string, date?: string) {
  return useQuery({ queryKey: projectKeys.members(id, date), queryFn: () => getProjectMembers(id, date) });
}

export function useProjectCreateScope() {
  return useQuery({ queryKey: projectKeys.createScope, queryFn: getProjectCreateScope, staleTime: SLOW_STALE_TIME });
}

export function useOrgDepartments() {
  return useQuery({ queryKey: projectKeys.departments, queryFn: getOrgDepartments, staleTime: SLOW_STALE_TIME });
}

export function useOrgOffices() {
  return useQuery({ queryKey: projectKeys.offices, queryFn: getOrgOffices, staleTime: SLOW_STALE_TIME });
}

/** Số ký tự tối thiểu backend nhận để tìm người (tránh lộ danh bạ khi để trống). */
export const EMPLOYEE_SEARCH_MIN_LENGTH = 2;

export function useEmployeeOptions(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.employees(keyword),
    queryFn: () => searchEmployeeOptions(keyword),
    enabled: enabled && keyword.length >= EMPLOYEE_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });
}

/** Bộ lọc nằm trên URL (gửi link / F5 vẫn giữ). Đổi bằng router.replace để Back không lùi từng lần lọc. */
export function useProjectFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<ProjectFilters>) => {
      const query = filtersToSearchParams({ ...filtersFromSearchParams(searchParams), ...patch }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { filters, updateFilters };
}

/** Thao tác ghi: xong thì làm mới mọi query dự án. Lỗi "dữ liệu đã đổi" cũng làm mới để màn hình đúng. */
export function useProjectMutation<TVariables, TResult = unknown>(action: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    onError: (error) => {
      if (isStaleProjectError(error)) void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Thông báo lỗi theo mã của module dự án, rơi về thông báo chung. */
export function useProjectErrorMessage() {
  const t = useTranslations("Projects.Errors");
  const tErrors = useTranslations("Errors");
  return useCallback((error: unknown) => getProjectError(error, t, tErrors), [t, tErrors]);
}
