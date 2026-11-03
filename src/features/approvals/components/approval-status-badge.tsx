"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus, ApproverDecision, StepStatus } from "../types";

type BadgeVariant = "warning" | "success" | "destructive" | "secondary" | "info" | "outline";

const STATUS_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

const STEP_VARIANT: Record<StepStatus, BadgeVariant> = {
  WAITING: "outline",
  IN_PROGRESS: "info",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

const DECISION_VARIANT: Record<ApproverDecision, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  NOT_REQUIRED: "secondary",
};

/** Trạng thái cả yêu cầu: Chờ duyệt / Đã duyệt / Từ chối / Đã rút. */
export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const t = useTranslations("Approvals.status");
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{t.has(status) ? t(status) : status}</Badge>;
}

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const t = useTranslations("Approvals.stepStatus");
  return <Badge variant={STEP_VARIANT[status] ?? "outline"}>{t.has(status) ? t(status) : status}</Badge>;
}

export function DecisionBadge({ decision }: { decision: ApproverDecision }) {
  const t = useTranslations("Approvals.decision");
  return <Badge variant={DECISION_VARIANT[decision] ?? "outline"}>{t.has(decision) ? t(decision) : decision}</Badge>;
}
