"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { statusTone, type Tone } from "../calendar";
import type { ApprovalStatus, LeaveRequest, LeaveRequestStatus, TimesheetStatus } from "../types";

type BadgeVariant = "success" | "warning" | "destructive" | "info" | "secondary" | "outline";

const BADGE: Record<Tone, BadgeVariant> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
  muted: "secondary",
  outline: "outline",
};

/** Nền ô lịch theo trạng thái ngày (token màu của theme). */
export const CELL_TONE: Record<Tone, string> = {
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
  info: "bg-info/10",
  muted: "bg-muted/40",
  outline: "",
};

export function DayStatusBadge({ status }: { status: TimesheetStatus }) {
  const t = useTranslations("Timesheet.status");
  return <Badge variant={BADGE[statusTone(status)]}>{t(status)}</Badge>;
}

const REQUEST_VARIANT: Record<LeaveRequestStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
  CANCELLED: "secondary",
};

/** Trạng thái đơn nghỉ, kèm trạng thái yêu cầu hủy nếu đang chờ / bị từ chối. */
export function LeaveStatusBadge({ request }: { request: LeaveRequest }) {
  const t = useTranslations("Leave");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={REQUEST_VARIANT[request.status]}>{t(`requestStatus.${request.status}`)}</Badge>
      {request.status === "APPROVED" && request.cancelStatus && request.cancelStatus !== "APPROVED" && (
        <Badge variant={request.cancelStatus === "PENDING" ? "warning" : "outline"}>
          {t(`cancelStatus.${request.cancelStatus}`)}
        </Badge>
      )}
      {request.shortNotice && <Badge variant="destructive">{t("shortNotice")}</Badge>}
    </span>
  );
}

const APPROVAL_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const t = useTranslations("Leave.requestStatus");
  return <Badge variant={APPROVAL_VARIANT[status]}>{t(status)}</Badge>;
}
