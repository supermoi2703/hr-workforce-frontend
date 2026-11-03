import {
  APPROVAL_STATUSES,
  APPROVAL_TABS,
  APPROVAL_TYPES,
  type ApprovalFilters,
  type ApprovalStatus,
  type ApprovalTab,
  type ApprovalType,
} from "./types";

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * Đọc tab + bộ lọc từ URL. Giá trị lạ bị bỏ qua thay vì để backend trả 400. Tab "all" cần approval:read-all:
 * không có quyền thì về "inbox" (vd mở link người khác gửi). Inbox luôn là đơn đang chờ nên bỏ `status`.
 */
export function filtersFromSearchParams(
  params: { get(name: string): string | null },
  canReadAll: boolean,
): ApprovalFilters {
  const requested = oneOf<ApprovalTab>(APPROVAL_TABS, params.get("tab")) ?? "inbox";
  const tab = requested === "all" && !canReadAll ? "inbox" : requested;
  return {
    tab,
    type: oneOf<ApprovalType>(APPROVAL_TYPES, params.get("type")),
    status: tab === "inbox" ? undefined : oneOf<ApprovalStatus>(APPROVAL_STATUSES, params.get("status")),
  };
}

/** Ghi ra query string, bỏ giá trị mặc định (tab inbox) và giá trị trống để link gọn. */
export function filtersToSearchParams(filters: ApprovalFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== "inbox") params.set("tab", filters.tab);
  if (filters.type) params.set("type", filters.type);
  if (filters.status && filters.tab !== "inbox") params.set("status", filters.status);
  return params;
}
