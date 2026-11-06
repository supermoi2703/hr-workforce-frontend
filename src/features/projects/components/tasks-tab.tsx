"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { transitionTask } from "../api";
import { useMembers, useProjectErrorMessage, useProjectMutation, useTasks } from "../hooks";
import { formatMinutes } from "../rules";
import { TASK_STATUSES, type Project, type TaskCard, type TaskStatus } from "../types";
import { PersonChip, PriorityIcon, TypeIcon } from "./badges";
import { SimpleSelect } from "./simple-select";

const PAGE = { pageIndex: 0, pageSize: 100 };
const ALL = "ALL";

/** S4: danh sách việc, lọc và đổi trạng thái ngay trên dòng. */
export function TasksTab({ project, onOpenTask }: { project: Project; onOpenTask: (key: string) => void }) {
  const t = useTranslations("Projects");
  const errorMessage = useProjectErrorMessage();
  const [status, setStatus] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);
  const [q, setQ] = useState("");
  const members = useMembers(project.id);
  const tasks = useTasks(project.id, PAGE, {
    status: status === ALL ? undefined : (status as TaskStatus),
    assigneeId: assignee === ALL ? undefined : assignee,
    q: q.trim() || undefined,
  });
  const transition = useProjectMutation(({ task, to }: { task: TaskCard; to: TaskStatus }) => transitionTask(task.id, to, task.version));

  const statusOptions = [{ value: ALL, label: t("allStatuses") }, ...TASK_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))];
  const assigneeOptions = [
    { value: ALL, label: t("allPeople") },
    ...(members.data?.members ?? []).map((member) => ({ value: member.person.id, label: member.person.fullName })),
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-56" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("searchTask")} />
        <SimpleSelect className="w-44" value={status} onChange={setStatus} options={statusOptions} />
        <SimpleSelect className="w-52" value={assignee} onChange={setAssignee} options={assigneeOptions} />
      </div>
      {tasks.isPending ? (
        <LoadingState />
      ) : tasks.isError ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : tasks.data.content.length === 0 ? (
        <EmptyState title={t("noTasks")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("key")}</TableHead>
                <TableHead>{t("taskTitle")}</TableHead>
                <TableHead>{t("statusLabel")}</TableHead>
                <TableHead>{t("assignee")}</TableHead>
                <TableHead>{t("dueDate")}</TableHead>
                <TableHead className="text-right">{t("estimate")}</TableHead>
                <TableHead className="text-right">{t("remaining")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.data.content.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <button type="button" className="text-primary inline-flex items-center gap-1.5 font-mono hover:underline" onClick={() => onOpenTask(task.key)}>
                      <TypeIcon type={task.type} />
                      {task.key}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-80">
                    <span className="flex items-center gap-2">
                      <PriorityIcon priority={task.priority} />
                      <span className="truncate">{task.title}</span>
                      {task.blocked && <Badge variant="destructive">{t("blocked")}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SimpleSelect
                      size="sm"
                      className="w-36"
                      value={task.status}
                      onChange={(to) =>
                        transition.mutate({ task, to: to as TaskStatus }, { onError: (error) => toast.error(errorMessage(error)) })
                      }
                      options={TASK_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
                    />
                  </TableCell>
                  <TableCell>
                    <PersonChip person={task.assignee} emptyLabel={t("unassigned")} />
                  </TableCell>
                  <TableCell className={task.overdue ? "text-destructive" : undefined}>{formatDate(task.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(task.estimateMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(task.remainingMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
