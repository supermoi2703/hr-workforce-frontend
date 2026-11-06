"use client";

import { ArrowDownIcon, ArrowUpIcon, BookmarkIcon, BugIcon, ChevronsUpIcon, EqualIcon, SquareCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { Person, TaskPriority, TaskStatus, TaskType } from "../types";

const STATUS_VARIANT: Record<TaskStatus, "secondary" | "info" | "warning" | "success" | "outline"> = {
  TODO: "secondary",
  IN_PROGRESS: "info",
  IN_REVIEW: "warning",
  DONE: "success",
  CANCELLED: "outline",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslations("Projects.status");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}

const PRIORITY_ICON = { URGENT: ChevronsUpIcon, HIGH: ArrowUpIcon, MEDIUM: EqualIcon, LOW: ArrowDownIcon };
const PRIORITY_TONE: Record<TaskPriority, string> = {
  URGENT: "text-destructive",
  HIGH: "text-warning",
  MEDIUM: "text-info",
  LOW: "text-muted-foreground",
};

export function PriorityIcon({ priority }: { priority: TaskPriority }) {
  const t = useTranslations("Projects.priority");
  const Icon = PRIORITY_ICON[priority];
  return (
    <span title={t(priority)} className={cn("inline-flex", PRIORITY_TONE[priority])}>
      <Icon className="size-4" aria-label={t(priority)} />
    </span>
  );
}

const TYPE_ICON = { TASK: SquareCheckIcon, STORY: BookmarkIcon, BUG: BugIcon };
const TYPE_TONE: Record<TaskType, string> = { TASK: "text-info", STORY: "text-success", BUG: "text-destructive" };

export function TypeIcon({ type }: { type: TaskType }) {
  const t = useTranslations("Projects.type");
  const Icon = TYPE_ICON[type];
  return (
    <span title={t(type)} className={cn("inline-flex", TYPE_TONE[type])}>
      <Icon className="size-4" aria-label={t(type)} />
    </span>
  );
}

export function PersonChip({ person, emptyLabel }: { person: Person | null; emptyLabel?: string }) {
  if (!person) return <span className="text-muted-foreground">{emptyLabel ?? "—"}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <UserAvatar name={person.fullName} seed={person.id} size="sm" />
      <span className="truncate">{person.fullName}</span>
    </span>
  );
}
