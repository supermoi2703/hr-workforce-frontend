import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import { toApiRange } from "./filters";
import type { AuditFilters, AuditLogEntry } from "./types";

/**
 * Nhật ký hệ thống (audit:read, chỉ ADMIN), mới nhất trước. Backend chỉ sort theo createdAt nên không gửi `sort`.
 * Nhãn (actorLabel / targetLabel) chỉ để hiện chip, không gửi lên.
 */
export const searchAuditLogs = (filters: AuditFilters, params: PageParams) =>
  http.get<PageResponse<AuditLogEntry>>("/api/audit-logs", {
    query: {
      ...toPageQuery({ page: params.page, size: params.size }),
      action: filters.action,
      outcome: filters.outcome,
      actorId: filters.actorId,
      targetType: filters.targetType,
      targetId: filters.targetId,
      ...toApiRange(filters.from, filters.to),
    },
  });
