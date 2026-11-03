"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { approveApproval, getAll, getApproval, getInbox, getMine, rejectApproval, withdrawApproval } from "./api";
import { isStaleApprovalError } from "./error-messages";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import { personLabel } from "./rules";
import { APPROVAL_TYPES, type ApprovalFilters, type ApprovalType } from "./types";

export const READ_ALL_PERMISSION = "approval:read-all";

export const approvalKeys = {
  all: ["approvals"] as const,
  list: (filters: ApprovalFilters, params: PageParams) => ["approvals", "list", filters, params] as const,
  inboxCount: ["approvals", "inbox-count"] as const,
  detail: (id: string) => ["approvals", "detail", id] as const,
};

/**
 * Danh sách theo tab. `staleTime: 0`: đơn có thể vừa được duyệt ở trang khác (vd tab "Cần tôi duyệt" của /leave),
 * nên mở lại trang là tải lại ngay. Tab "all" chỉ gọi khi có approval:read-all (không thì backend trả 403).
 */
export function useApprovalList(filters: ApprovalFilters, params: PageParams) {
  const { hasPermission } = useCurrentUser();
  return useQuery({
    queryKey: approvalKeys.list(filters, params),
    queryFn: () => {
      if (filters.tab === "inbox") return getInbox(filters.type, params);
      if (filters.tab === "mine") return getMine(filters, params);
      return getAll(filters, params);
    },
    enabled: filters.tab !== "all" || hasPermission(READ_ALL_PERMISSION),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/** Số đơn đang chờ tôi duyệt (badge trên tab): chỉ cần totalElements nên lấy trang 1 dòng. */
export function useInboxCount() {
  return useQuery({
    queryKey: approvalKeys.inboxCount,
    queryFn: () => getInbox(undefined, { page: 0, size: 1 }),
    select: (page) => page.totalElements,
    staleTime: 0,
  });
}

export function useApproval(id: string) {
  return useQuery({ queryKey: approvalKeys.detail(id), queryFn: () => getApproval(id), staleTime: 0 });
}

/** Tab + bộ lọc nằm trên URL (gửi link / F5 vẫn giữ). Đổi bằng router.replace để nút Back không lùi qua từng lần lọc. */
export function useApprovalFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission } = useCurrentUser();
  const canReadAll = hasPermission(READ_ALL_PERMISSION);
  const filters = useMemo(() => filtersFromSearchParams(searchParams, canReadAll), [searchParams, canReadAll]);

  const setFilters = useCallback(
    (next: ApprovalFilters) => {
      const query = filtersToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { filters, setFilters, canReadAll };
}

/**
 * Duyệt / từ chối / rút làm thay đổi dữ liệu của module gốc (số dư phép, bảng công, giờ làm...), mà feature này không
 * biết queryKey của module khác: làm mới MỌI query đang dùng (query không có ai dùng chỉ bị đánh dấu cũ, không gọi lại).
 * Lỗi "dữ liệu đã cũ" (người khác vừa duyệt...) cũng làm mới để màn hình hiện đúng trạng thái.
 */
function useRefreshAfterDecision() {
  const queryClient = useQueryClient();
  return {
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error: unknown) => {
      if (isStaleApprovalError(error)) void queryClient.invalidateQueries();
    },
  };
}

export function useDecideApproval() {
  const refresh = useRefreshAfterDecision();
  return useMutation({
    mutationFn: ({ id, approved, comment }: { id: string; approved: boolean; comment: string }) =>
      approved ? approveApproval(id, comment || null) : rejectApproval(id, comment),
    ...refresh,
  });
}

export function useWithdrawApproval() {
  const refresh = useRefreshAfterDecision();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => withdrawApproval(id, reason || null),
    ...refresh,
  });
}

/** Tên một người trên màn hình: "Bạn" / "Hệ thống" / tên từ backend / "Người dùng" khi backend chưa trả tên. */
export function usePersonName() {
  const t = useTranslations("Approvals.people");
  const { user } = useCurrentUser();
  const myUserId = user?.id ?? "";
  return useCallback(
    (userId: string | null, name: string | null | undefined) => {
      const label = personLabel(userId, name, myUserId);
      return label.kind === "name" ? label.name : t(label.kind);
    },
    [t, myUserId],
  );
}

/** Tên bước: bước theo quy tắc chung dùng bản dịch của quy tắc; bước SPECIFIC dùng tên module gốc đặt. */
export function useStepLabel() {
  const t = useTranslations("Approvals.rules");
  return useCallback(
    (rule: string, name: string) => (rule !== "SPECIFIC" && t.has(rule as never) ? t(rule as never) : name),
    [t],
  );
}

/** Nhãn loại yêu cầu; loại backend mới thêm mà chưa có bản dịch thì hiện nguyên mã. */
export function useApprovalTypeLabel() {
  const t = useTranslations("Approvals.types");
  return useCallback(
    (type: string) => ((APPROVAL_TYPES as readonly string[]).includes(type) ? t(type as ApprovalType) : type),
    [t],
  );
}
