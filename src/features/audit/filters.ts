import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_TARGET_TYPES,
  type AuditAction,
  type AuditFilters,
  type AuditOutcome,
  type AuditTargetType,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LABEL_LENGTH = 254;

/** Thứ tự tham số trên URL (để link gọn, ổn định). */
const KEYS = ["action", "outcome", "actorId", "actorLabel", "targetType", "targetId", "targetLabel", "from", "to"] as const;

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

function isValidDate(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // "2026-02-31" → Date tự chuyển sang tháng 3: so lại chuỗi để loại ngày không có thật.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function label(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_LABEL_LENGTH) : undefined;
}

/**
 * Đọc bộ lọc từ URL. Giá trị lạ (action không tồn tại, id không phải UUID, ngày sai) bị bỏ qua thay vì để backend trả 400.
 * Mã role không phải UUID nên targetId chỉ bắt buộc dạng UUID khi targetType là USER.
 */
export function filtersFromSearchParams(params: { get(name: string): string | null }): AuditFilters {
  const targetType = oneOf<AuditTargetType>(AUDIT_TARGET_TYPES, params.get("targetType"));
  const rawTargetId = params.get("targetId")?.trim();
  const targetId =
    targetType && rawTargetId && (targetType !== "USER" || UUID_PATTERN.test(rawTargetId)) ? rawTargetId : undefined;
  const rawActorId = params.get("actorId")?.trim();
  const actorId = rawActorId && UUID_PATTERN.test(rawActorId) ? rawActorId : undefined;
  const from = params.get("from");
  const to = params.get("to");

  const filters: AuditFilters = {
    action: oneOf<AuditAction>(AUDIT_ACTIONS, params.get("action")),
    outcome: oneOf<AuditOutcome>(AUDIT_OUTCOMES, params.get("outcome")),
    actorId,
    actorLabel: actorId ? label(params.get("actorLabel")) : undefined,
    targetType: targetId ? targetType : undefined,
    targetId,
    targetLabel: targetId ? label(params.get("targetLabel")) : undefined,
    from: isValidDate(from) ? from : undefined,
    to: isValidDate(to) ? to : undefined,
  };
  // Khoảng ngày ngược (từ sau đến) → đổi chỗ cho đúng.
  if (filters.from && filters.to && filters.from > filters.to) [filters.from, filters.to] = [filters.to, filters.from];
  return filters;
}

/** Ghi bộ lọc ra query string (bỏ giá trị trống). */
export function filtersToSearchParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

/** "2026-10-01" → mốc 00:00 giờ Việt Nam (UTC+7, không có giờ mùa hè) dạng ISO. */
function startOfVietnamDay(date: string): Date {
  return new Date(`${date}T00:00:00+07:00`);
}

/**
 * Khoảng ngày (tính cả hai đầu, giờ Việt Nam) → tham số from / to của backend.
 * Backend so `createdAt >= from` và `createdAt < to`, nên `to` là đầu ngày HÔM SAU.
 */
export function toApiRange(from?: string, to?: string): { from?: string; to?: string } {
  const range: { from?: string; to?: string } = {};
  if (from) range.from = startOfVietnamDay(from).toISOString();
  if (to) {
    const end = startOfVietnamDay(to);
    end.setUTCDate(end.getUTCDate() + 1);
    range.to = end.toISOString();
  }
  return range;
}

/** Đang lọc gì không (để hiện nút "Xóa bộ lọc"). */
export function hasActiveFilters(filters: AuditFilters): boolean {
  return KEYS.some((key) => !!filters[key]);
}
