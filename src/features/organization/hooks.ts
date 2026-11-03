"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import { getOrgChart, getOrgChartMembers, getOrgChartOffices } from "./api";
import { stateFromSearchParams, stateToSearchParams, type OrgPageState } from "./rules";
import type { MemberFilters } from "./types";

// Sơ đồ tổ chức ít đổi: giữ 5 phút. Sửa trên trang này thì useOrgAdminMutation tự làm mới; người khác sửa thì F5.
const STALE_TIME = 5 * 60_000;

export const orgChartKeys = {
  all: ["org-chart"] as const,
  tree: (officeId: string | undefined) => ["org-chart", "tree", officeId ?? "all"] as const,
  offices: ["org-chart", "offices"] as const,
  members: (filters: MemberFilters, params: PageParams) => ["org-chart", "members", filters, params] as const,
};

export function useOrgChart(officeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: orgChartKeys.tree(officeId),
    queryFn: () => getOrgChart(officeId),
    enabled,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useOrgChartOffices() {
  return useQuery({ queryKey: orgChartKeys.offices, queryFn: getOrgChartOffices, staleTime: STALE_TIME });
}

export function useOrgMembers(filters: MemberFilters, params: PageParams, enabled = true) {
  return useQuery({
    queryKey: orgChartKeys.members(filters, params),
    queryFn: () => getOrgChartMembers(filters, params),
    enabled,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/** Cách xem, văn phòng, nút đang chọn, từ khóa nằm trên URL. Đổi bằng router.replace để nút Back không lùi qua từng lần bấm. */
export function useOrgPageState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => stateFromSearchParams(searchParams), [searchParams]);

  const setState = useCallback(
    (next: OrgPageState) => {
      const query = stateToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { state, setState };
}

/**
 * Thao tác quản trị đơn vị (tạo, sửa, gán trưởng, ngừng dùng). Xong thì làm mới mọi query của cây tổ chức: số người,
 * trưởng đơn vị, danh sách đều có thể đổi.
 */
export function useOrgAdminMutation<TVariables>(action: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgChartKeys.all }),
  });
}
