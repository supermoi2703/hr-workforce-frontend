"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { deadlineState, type DeadlineState } from "../rules";
import type { ProjectRole, ProjectStatus } from "../types";

const DEADLINE_VARIANT: Record<DeadlineState, "info" | "warning" | "destructive"> = {
  notStarted: "info",
  endingSoon: "warning",
  overdue: "destructive",
};

const ROLE_VARIANT: Record<ProjectRole, "info" | "secondary" | "outline"> = {
  PM: "info",
  MEMBER: "secondary",
  OBSERVER: "outline",
};

/** Đang chạy / đã đóng, kèm cảnh báo theo ngày (chưa bắt đầu, sắp hết hạn, quá hạn) nếu có. */
export function ProjectStatusBadge({
  project,
  today,
}: {
  project: { status: ProjectStatus; startDate: string; endDate: string | null };
  today: string;
}) {
  const t = useTranslations("Projects.statuses");
  const tDeadline = useTranslations("Projects.deadline");
  const deadline = deadlineState(project, today);
  if (deadline) return <Badge variant={DEADLINE_VARIANT[deadline]}>{tDeadline(deadline)}</Badge>;
  return <Badge variant={project.status === "ACTIVE" ? "success" : "secondary"}>{t(project.status)}</Badge>;
}

export function ProjectRoleBadge({ role }: { role: ProjectRole }) {
  const t = useTranslations("Projects.roles");
  return <Badge variant={ROLE_VARIANT[role]}>{t(role)}</Badge>;
}
