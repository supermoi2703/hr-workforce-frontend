"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { OvertimeKind, OvertimeStatus } from "../types";

type BadgeVariant = "warning" | "success" | "destructive" | "secondary" | "info" | "outline";

const STATUS_VARIANT: Record<OvertimeStatus, BadgeVariant> = {
  WAIT_EMPLOYEE: "warning",
  WAIT_APPROVAL: "warning",
  ACTIVE: "info",
  REJECTED: "destructive",
  CANCELLED: "secondary",
  EXPIRED: "secondary",
  SETTLED: "success",
};

/**
 * Trạng thái phiếu. `forMe`: người xem là người được giao, nên "Chờ nhân viên xác nhận" thành "Chờ bạn xác nhận".
 * Trạng thái backend mới thêm mà chưa có bản dịch thì hiện nguyên mã.
 */
export function OvertimeStatusBadge({ status, forMe = false }: { status: OvertimeStatus; forMe?: boolean }) {
  const t = useTranslations("Overtime.statuses");
  const tMe = useTranslations("Overtime.statusForMe");
  const label = forMe && tMe.has(status as never) ? tMe(status as never) : t.has(status) ? t(status) : status;
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{label}</Badge>;
}

export function OvertimeKindBadge({ kind }: { kind: OvertimeKind }) {
  const t = useTranslations("Overtime.kinds");
  return <Badge variant="outline">{t.has(kind) ? t(kind) : kind}</Badge>;
}
