"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import {
  changeEmployeeStatus,
  createEmployee,
  getDepartments,
  getEmployee,
  getMyProfile,
  getMySensitive,
  getOffices,
  getPositions,
  getSensitive,
  getTeams,
  provisionAccount,
  searchEmployees,
  updateEmployee,
  updateMyProfile,
  updateSensitive,
} from "./api";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import { buildOrgLookup } from "./rules";
import type { EmployeeDetail, EmployeeFilters, EmployeeInput, EmployeeStatusInput, PersonalInfo, SensitiveInput } from "./types";

/** Query key của domain hồ sơ. Mọi key bắt đầu bằng "employees" để invalidate cả nhóm sau khi sửa. */
export const employeeKeys = {
  all: ["employees"] as const,
  list: (filters: EmployeeFilters, params: PageParams) => ["employees", "list", filters, params] as const,
  detail: (id: string) => ["employees", "detail", id] as const,
  sensitive: (id: string) => ["employees", "sensitive", id] as const,
  me: ["employees", "me"] as const,
  mySensitive: ["employees", "me", "sensitive"] as const,
  org: (kind: "offices" | "departments" | "teams" | "positions") => ["employees", "org", kind] as const,
};

/** Trạng thái tài khoản đổi theo hồ sơ (nghỉ việc → khóa, cấp tài khoản): làm mới cả trang tài khoản (key "users"). */
const USERS_KEY = ["users"] as const;

/** Thông tin nhạy cảm: không giữ trong bộ nhớ đệm lâu sau khi rời màn hình. */
const SENSITIVE_GC_TIME = 30_000;

/** Bộ lọc danh sách nằm trên URL (F5 / gửi link giữ nguyên); đổi bằng router.replace để Back không lặp từng lần gõ. */
export function useEmployeeFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<EmployeeFilters>) => {
      const query = filtersToSearchParams({ ...filters, ...patch }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, router, pathname],
  );

  return { filters, updateFilters };
}

export function useEmployees(filters: EmployeeFilters, params: PageParams) {
  return useQuery({
    queryKey: employeeKeys.list(filters, params),
    queryFn: () => searchEmployees(filters, params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string) {
  return useQuery({ queryKey: employeeKeys.detail(id), queryFn: () => getEmployee(id) });
}

/** Hồ sơ của người đang đăng nhập; chỉ gọi khi tài khoản có gắn hồ sơ (không thì 403 EMPLOYEE_PROFILE_REQUIRED). */
export function useMyProfile(enabled: boolean) {
  return useQuery({ queryKey: employeeKeys.me, queryFn: getMyProfile, enabled });
}

export function useMySensitive(enabled: boolean) {
  return useQuery({ queryKey: employeeKeys.mySensitive, queryFn: getMySensitive, enabled, gcTime: SENSITIVE_GC_TIME });
}

/** Chỉ gọi khi có employee:sensitive và đang mở tab. */
export function useSensitive(id: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.sensitive(id),
    queryFn: () => getSensitive(id),
    enabled,
    gcTime: SENSITIVE_GC_TIME,
  });
}

/**
 * Bốn danh mục tổ chức (kể cả đơn vị đã ngừng dùng) và hàm tra id → đơn vị. Danh mục ít đổi nên giữ 10 phút;
 * chưa tải xong thì tra cứu trả undefined (bảng hiện "—").
 */
export function useOrgUnits() {
  const options = { staleTime: 10 * 60_000 };
  const [offices, departments, teams, positions] = useQueries({
    queries: [
      { queryKey: employeeKeys.org("offices"), queryFn: getOffices, ...options },
      { queryKey: employeeKeys.org("departments"), queryFn: getDepartments, ...options },
      { queryKey: employeeKeys.org("teams"), queryFn: getTeams, ...options },
      { queryKey: employeeKeys.org("positions"), queryFn: getPositions, ...options },
    ],
  });
  const units = useMemo(
    () => ({ offices: offices.data, departments: departments.data, teams: teams.data, positions: positions.data }),
    [offices.data, departments.data, teams.data, positions.data],
  );
  const lookup = useMemo(() => buildOrgLookup(units), [units]);
  const isPending = offices.isPending || departments.isPending || teams.isPending || positions.isPending;
  return { ...units, lookup, isPending };
}

// ===== Ghi =====

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: (created) => {
      queryClient.setQueryData(employeeKeys.detail(created.id), created);
      return queryClient.invalidateQueries({ queryKey: [...employeeKeys.all, "list"] });
    },
  });
}

/** Response có version mới: ghi thẳng vào cache chi tiết để lần sửa tiếp không bị 409. */
function useStoreDetail() {
  const queryClient = useQueryClient();
  return (detail: EmployeeDetail) => {
    queryClient.setQueryData(employeeKeys.detail(detail.id), detail);
    return queryClient.invalidateQueries({ queryKey: employeeKeys.all, predicate: (q) => q.queryKey[1] !== "detail" });
  };
}

export function useUpdateEmployee(id: string) {
  const store = useStoreDetail();
  return useMutation({ mutationFn: (body: EmployeeInput) => updateEmployee(id, body), onSuccess: store });
}

export function useChangeEmployeeStatus(id: string) {
  const queryClient = useQueryClient();
  const store = useStoreDetail();
  return useMutation({
    mutationFn: (body: EmployeeStatusInput) => changeEmployeeStatus(id, body),
    onSuccess: async (result) => {
      await store(result.employee);
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useProvisionAccount(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => provisionAccount(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
        queryClient.invalidateQueries({ queryKey: USERS_KEY }),
      ]),
  });
}

export function useUpdateSensitive(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SensitiveInput) => updateSensitive(id, body),
    onSuccess: (saved) => queryClient.setQueryData(employeeKeys.sensitive(id), saved),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { personal: PersonalInfo; version: number }) => updateMyProfile(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(employeeKeys.me, saved);
      queryClient.setQueryData(employeeKeys.detail(saved.id), saved);
    },
  });
}

/** Tải lại hồ sơ sau lỗi "dữ liệu cũ" (409 version / chuyển trạng thái / đã có tài khoản). */
export function useRefreshEmployee() {
  const queryClient = useQueryClient();
  return (id?: string) =>
    queryClient.invalidateQueries({ queryKey: id ? employeeKeys.detail(id) : employeeKeys.me });
}
