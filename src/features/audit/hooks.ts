"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PageParams } from "@/lib/api/types";
import { ROLES, type RoleCode, type UserStatus } from "@/lib/auth/types";
import { searchAuditLogs } from "./api";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import type { MetadataLabels } from "./metadata";
import { AUDIT_ACTIONS, type AuditAction, type AuditFilters } from "./types";

export const auditKeys = {
  all: ["audit"] as const,
  list: (filters: AuditFilters, params: PageParams) => ["audit", "list", filters, params] as const,
};

export function useAuditLogs(filters: AuditFilters, params: PageParams) {
  return useQuery({
    queryKey: auditKeys.list(filters, params),
    queryFn: () => searchAuditLogs(filters, params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Bộ lọc nằm trên URL (gửi link / F5 vẫn giữ). Đổi bộ lọc bằng router.replace để nút Back không phải lùi qua
 * từng lần đổi lọc.
 */
export function useAuditFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: AuditFilters) => {
      const query = filtersToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const updateFilters = useCallback((patch: Partial<AuditFilters>) => setFilters({ ...filters, ...patch }), [filters, setFilters]);

  return { filters, setFilters, updateFilters };
}

const USER_STATUSES: UserStatus[] = ["PENDING", "ACTIVE", "LOCKED", "DISABLED"];

/** Nhãn hành động; action backend mới thêm mà chưa có bản dịch thì hiện nguyên mã. */
export function useActionLabel() {
  const t = useTranslations("AuditActions");
  return useCallback(
    (action: string) => ((AUDIT_ACTIONS as readonly string[]).includes(action) ? t(action as AuditAction) : action),
    [t],
  );
}

/** Hàm dịch cho formatMetadata: nhãn khóa (AuditLog.Meta), giá trị (trạng thái, role, quyền, lý do...). */
export function useMetadataLabels(): MetadataLabels {
  const tMeta = useTranslations("AuditLog.Meta");
  const tValues = useTranslations("AuditLog.values");
  const tStatus = useTranslations("UserStatus");
  const tRole = useTranslations("Roles");
  const tPermission = useTranslations("Permissions");

  return useMemo<MetadataLabels>(
    () => ({
      key: (key) => (key !== "minutes" && tMeta.has(key as never) ? tMeta(key as never) : null),
      value: (value) => {
        if (USER_STATUSES.includes(value as UserStatus)) return tStatus(value as UserStatus);
        if (ROLES.includes(value as RoleCode)) return tRole(value as RoleCode);
        if (tValues.has(value as never)) return tValues(value as never);
        // Mã quyền "user:read" → Permissions.user_read.name
        const permissionKey = `${value.replace(/[:-]/g, "_")}.name`;
        if (value.includes(":") && tPermission.has(permissionKey as never)) return tPermission(permissionKey as never);
        return null;
      },
      minutes: (count) => tMeta("minutes", { count }),
    }),
    [tMeta, tValues, tStatus, tRole, tPermission],
  );
}
