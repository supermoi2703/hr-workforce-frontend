"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import {
  getEmployeeSkills,
  getMySkills,
  getOfficesForSkills,
  getOrgChartForSkills,
  getPendingSkills,
  getSkills,
  getVerifierStatus,
  searchBySkills,
} from "./api";
import { getSkillError, isStaleSkillError } from "./error-messages";
import { availableTabs, stateFromSearchParams, stateToSearchParams, type SkillPageState } from "./rules";
import type { SkillSearchCriteria } from "./types";

// Danh mục và cây tổ chức ít đổi: giữ 5 phút. Kỹ năng của người: luôn tải lại khi mở (quản lý có thể vừa xác nhận).
const SLOW_STALE_TIME = 5 * 60_000;

export const skillKeys = {
  all: ["skills"] as const,
  catalog: ["skills", "catalog"] as const,
  mine: ["skills", "mine"] as const,
  employee: (employeeId: string) => ["skills", "employee", employeeId] as const,
  pending: (params: PageParams) => ["skills", "pending", params] as const,
  pendingCount: ["skills", "pending-count"] as const,
  search: (criteria: SkillSearchCriteria, params: PageParams) => ["skills", "search", criteria, params] as const,
  verifierStatus: ["skills", "verifier-status"] as const,
  orgChart: ["skills", "org-chart"] as const,
  offices: ["skills", "offices"] as const,
};

export function useSkillCatalog() {
  return useQuery({ queryKey: skillKeys.catalog, queryFn: getSkills, staleTime: SLOW_STALE_TIME });
}

export function useMySkills() {
  // Không thử lại khi lỗi nghiệp vụ (vd tài khoản chưa có hồ sơ): thử lại cũng ra cùng lỗi.
  return useQuery({ queryKey: skillKeys.mine, queryFn: getMySkills, retry: false });
}

export function useEmployeeSkills(employeeId: string | undefined) {
  return useQuery({
    queryKey: skillKeys.employee(employeeId ?? ""),
    queryFn: () => getEmployeeSkills(employeeId!),
    enabled: !!employeeId,
    staleTime: 0,
  });
}

export function usePendingSkills(params: PageParams, enabled: boolean) {
  return useQuery({
    queryKey: skillKeys.pending(params),
    queryFn: () => getPendingSkills(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/** Số kỹ năng chờ tôi xác nhận (badge trên tab): chỉ cần totalElements nên lấy trang 1 dòng. */
export function usePendingCount(enabled: boolean) {
  return useQuery({
    queryKey: skillKeys.pendingCount,
    queryFn: () => getPendingSkills({ page: 0, size: 1 }),
    select: (page) => page.totalElements,
    enabled,
    staleTime: 0,
  });
}

export function useSkillSearch(criteria: SkillSearchCriteria, params: PageParams) {
  return useQuery({
    queryKey: skillKeys.search(criteria, params),
    queryFn: () => searchBySkills(criteria, params),
    enabled: criteria.requirements.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** Phòng ban / team / văn phòng: để lọc và hiện tên đơn vị trong kết quả tìm. */
export function useOrgUnits() {
  const chart = useQuery({ queryKey: skillKeys.orgChart, queryFn: getOrgChartForSkills, staleTime: SLOW_STALE_TIME });
  const offices = useQuery({ queryKey: skillKeys.offices, queryFn: getOfficesForSkills, staleTime: SLOW_STALE_TIME });
  return useMemo(() => {
    const departments = chart.data?.departments ?? [];
    const names = new Map<string, string>();
    departments.forEach((d) => {
      names.set(d.id, d.name);
      d.teams.forEach((team) => names.set(team.id, team.name));
    });
    (offices.data ?? []).forEach((o) => names.set(o.id, o.name));
    return { departments, offices: offices.data ?? [], nameOf: (id: string | null) => (id ? names.get(id) : undefined) };
  }, [chart.data, offices.data]);
}

/**
 * Tôi có xác nhận được cho ai không. Giữ 5 phút: chỉ đổi khi sơ đồ tổ chức đổi (được / thôi làm trưởng). Không thử lại
 * khi lỗi: coi như không xác nhận được (tab tự ẩn), không làm hỏng cả trang.
 */
export function useVerifierStatus() {
  return useQuery({ queryKey: skillKeys.verifierStatus, queryFn: getVerifierStatus, staleTime: SLOW_STALE_TIME, retry: false });
}

/** Tab và điều kiện tìm nằm trên URL (gửi link / F5 vẫn giữ). Đổi bằng router.replace để Back không lùi từng lần lọc. */
export function useSkillPageState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useCurrentUser();
  const verifier = useVerifierStatus();
  const canVerify = !!verifier.data?.canVerify;
  // Theo `user` (ổn định giữa các lần render), không theo hasPermission (hàm mới mỗi lần render).
  const tabs = useMemo(
    () => availableTabs((permission) => !!user?.permissions.includes(permission), canVerify),
    [user, canVerify],
  );
  // Chưa biết quyền (đang tải người dùng / trạng thái xác nhận): giữ tab trên URL, đừng ép về "mine".
  const loading = status === "loading" || verifier.isPending;
  const state = useMemo(
    () => stateFromSearchParams(searchParams, loading ? ["mine", "pending", "search", "catalog"] : tabs),
    [searchParams, tabs, loading],
  );

  const setState = useCallback(
    (next: SkillPageState) => {
      const query = stateToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { state, setState, tabs, loading };
}

/**
 * Thao tác ghi của module kỹ năng. Xong thì làm mới mọi query kỹ năng (danh mục, của tôi, hàng chờ, kết quả tìm đều
 * có thể đổi). Lỗi "dữ liệu đã đổi" cũng làm mới để màn hình đúng.
 */
export function useSkillMutation<TVariables, TResult = unknown>(action: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.all }),
    onError: (error) => {
      if (isStaleSkillError(error)) void queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

/** Thông báo lỗi theo mã của module kỹ năng, rơi về thông báo chung. */
export function useSkillErrorMessage() {
  const t = useTranslations("Skills.Errors");
  const tErrors = useTranslations("Errors");
  return useCallback((error: unknown) => getSkillError(error, t, tErrors), [t, tErrors]);
}
