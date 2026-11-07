"use client";

import { useState } from "react";
import { BanIcon, PencilIcon, Trash2Icon, UserRoundCogIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, todayIsoDate } from "@/lib/format";
import { addComment, addLink, addWorklog, deleteTask, deleteWorklog, removeLink, transitionTask } from "../work-api";
import { useComments, useEvents, useWorkErrorMessage, useWorkMutation, useTask, useWorklogs } from "../work-hooks";
import { formatMinutes, parseHours, percent } from "../work-rules";
import type { Project } from "../types";
import { BOARD_STATUSES, TASK_STATUSES, type LinkedTask, type Task, type TaskStatus } from "../work-types";
import { PersonChip, PriorityIcon, TaskStatusBadge, TypeIcon } from "./badges";
import { EventLine } from "./overview-tab";
import { ReassignDialog } from "./reassign-dialog";
import { SimpleSelect } from "./simple-select";
import { TaskFormDialog } from "./task-form-dialog";

/** S10: panel chi tiết việc, mở từ List, Board, Tổng quan bằng ?task=HRM-12. */
export function TaskSheet({
  taskKey,
  project,
  onClose,
  onOpenTask,
}: {
  taskKey: string | null;
  project: Project;
  onClose: () => void;
  onOpenTask: (key: string) => void;
}) {
  const task = useTask(taskKey);
  return (
    <Sheet open={!!taskKey} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {task.isPending ? (
          <LoadingState />
        ) : task.isError ? (
          <ErrorState error={task.error} onRetry={() => task.refetch()} />
        ) : (
          <TaskDetail task={task.data} project={project} onClose={onClose} onOpenTask={onOpenTask} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetail({ task, project, onClose, onOpenTask }: { task: Task; project: Project; onClose: () => void; onOpenTask: (key: string) => void }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const { card, can } = task;
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const transition = useWorkMutation((to: TaskStatus) => transitionTask(card.id, to, card.version));
  const remove = useWorkMutation(() => deleteTask(card.id));
  const statuses = can.cancel ? TASK_STATUSES : BOARD_STATUSES;
  const spent = card.loggedMinutes + (card.remainingMinutes ?? 0);

  return (
    <div className="grid gap-4 p-4">
      <SheetHeader className="p-0">
        <SheetDescription className="flex items-center gap-2 font-mono">
          <TypeIcon type={card.type} /> {card.key}
          <PriorityIcon priority={card.priority} />
        </SheetDescription>
        <SheetTitle>{card.title}</SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-2">
        {can.transition ? (
          <SimpleSelect
            size="sm"
            className="w-40"
            value={card.status}
            onChange={(to) => transition.mutate(to as TaskStatus, fail)}
            options={statuses.map((value) => ({ value, label: t(`status.${value}`) }))}
          />
        ) : (
          <TaskStatusBadge status={card.status} />
        )}
        {card.blocked && (
          <Badge variant="destructive">
            <BanIcon /> {t("blocked")}
          </Badge>
        )}
        {can.edit && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <PencilIcon /> {t("edit")}
          </Button>
        )}
        {project.can.editAnyTask && (
          <Button size="sm" variant="outline" onClick={() => setReassigning(true)}>
            <UserRoundCogIcon /> {t("reassign")}
          </Button>
        )}
        {can.delete && (
          <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(true)}>
            <Trash2Icon />
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("assignee")}</dt>
        <dd>
          <PersonChip person={card.assignee} emptyLabel={t("unassigned")} />
        </dd>
        <dt className="text-muted-foreground">{t("reporter")}</dt>
        <dd>
          <PersonChip person={task.reporter} />
        </dd>
        <dt className="text-muted-foreground">{t("dueDate")}</dt>
        <dd className={card.overdue ? "text-destructive" : undefined}>{formatDate(card.dueDate)}</dd>
        <dt className="text-muted-foreground">{t("estimate")}</dt>
        <dd className="tabular-nums">
          {t("timeRow", {
            estimate: formatMinutes(card.estimateMinutes),
            logged: formatMinutes(card.loggedMinutes),
            remaining: formatMinutes(card.remainingMinutes),
          })}
        </dd>
      </dl>
      {spent > 0 && (
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div className="bg-primary h-full" style={{ width: `${percent(card.loggedMinutes, spent)}%` }} />
        </div>
      )}

      {task.description && <p className="text-sm whitespace-pre-wrap">{task.description}</p>}

      <Links task={task} onOpenTask={onOpenTask} />
      <Separator />
      <WorklogSection task={task} />
      <Separator />
      <CommentSection task={task} />
      <Separator />
      <History task={task} />

      {editing && <TaskFormDialog project={project} task={task} onClose={() => setEditing(false)} />}
      {reassigning && <ReassignDialog taskId={card.id} taskKey={card.key} onClose={() => setReassigning(false)} />}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTaskTitle", { key: card.key })}
        description={t("deleteTaskDescription")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() =>
          remove.mutateAsync(undefined).then(onClose, (error) => {
            toast.error(errorMessage(error));
            throw error;
          })
        }
      />
    </div>
  );
}

function Links({ task, onOpenTask }: { task: Task; onOpenTask: (key: string) => void }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"BLOCKS" | "BLOCKED_BY">("BLOCKED_BY");
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const add = useWorkMutation(() => addLink(task.card.id, target, direction));
  const remove = useWorkMutation((linkId: string) => removeLink(task.card.id, linkId));

  const line = (item: LinkedTask) => (
    <li key={item.linkId ?? item.taskId} className="flex items-center gap-2 text-sm">
      <button type="button" className="text-primary font-mono hover:underline" onClick={() => onOpenTask(item.key)}>
        {item.key}
      </button>
      <span className="truncate">{item.title}</span>
      <TaskStatusBadge status={item.status} />
      {item.linkId && task.can.edit && (
        <button type="button" aria-label={t("removeLink")} className="text-muted-foreground ml-auto" onClick={() => remove.mutate(item.linkId!, fail)}>
          <Trash2Icon className="size-3.5" />
        </button>
      )}
    </li>
  );
  const groups = [
    { label: t("parent"), items: task.parent ? [task.parent] : [] },
    { label: t("children"), items: task.children },
    { label: t("blockedBy"), items: task.blockedBy },
    { label: t("blocks"), items: task.blocks },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-2">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-muted-foreground mb-1 text-xs">{group.label}</p>
          <ul className="grid gap-1">{group.items.map(line)}</ul>
        </div>
      ))}
      {task.can.edit && (
        <div className="flex items-center gap-2">
          <SimpleSelect
            size="sm"
            className="w-36"
            value={direction}
            onChange={(value) => setDirection(value as "BLOCKS" | "BLOCKED_BY")}
            options={[
              { value: "BLOCKED_BY", label: t("blockedBy") },
              { value: "BLOCKS", label: t("blocks") },
            ]}
          />
          <Input className="h-8 w-28 font-mono uppercase" placeholder="HRM-1" value={target} onChange={(event) => setTarget(event.target.value)} />
          <Button
            size="sm"
            variant="outline"
            disabled={!target.trim()}
            onClick={() => add.mutate(undefined, { ...fail, onSuccess: () => setTarget("") })}
          >
            {t("addLink")}
          </Button>
        </div>
      )}
    </div>
  );
}

function WorklogSection({ task }: { task: Task }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const worklogs = useWorklogs(task.card.id);
  const [day, setDay] = useState(todayIsoDate());
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const minutes = parseHours(hours);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const add = useWorkMutation(() => addWorklog(task.card.id, { workDate: day, minutes: minutes!, note: note.trim() || null }));
  const remove = useWorkMutation(deleteWorklog);
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{t("worklogTitle")}</h3>
      {task.can.logWork && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-8 w-36" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          <Input className="h-8 w-20" inputMode="decimal" placeholder={t("hoursPlaceholder")} value={hours} onChange={(event) => setHours(event.target.value)} />
          <Input className="h-8 min-w-32 flex-1" placeholder={t("notePlaceholder")} value={note} onChange={(event) => setNote(event.target.value)} />
          <Button
            size="sm"
            disabled={!minutes}
            onClick={() =>
              add.mutate(undefined, {
                ...fail,
                onSuccess: () => {
                  setHours("");
                  setNote("");
                },
              })
            }
          >
            {t("logWork")}
          </Button>
        </div>
      )}
      <ul className="grid gap-1 text-sm">
        {(worklogs.data ?? []).map((log) => (
          <li key={log.id} className="flex items-center gap-2">
            <span className="tabular-nums">{formatDate(log.workDate)}</span>
            <span className="font-medium tabular-nums">{formatMinutes(log.minutes)}</span>
            <span className="text-muted-foreground truncate">
              {log.employeeName}
              {log.note ? ` · ${log.note}` : ""}
            </span>
            {log.mine && (
              <button type="button" aria-label={t("delete")} className="text-muted-foreground ml-auto" onClick={() => setDeleting(log.id)}>
                <Trash2Icon className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteLogTitle")}
        description={t("deleteLogDescription")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() =>
          remove.mutateAsync(deleting!).then(
            () => setDeleting(null),
            (error) => {
              toast.error(errorMessage(error));
              throw error;
            },
          )
        }
      />
    </section>
  );
}

function CommentSection({ task }: { task: Task }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const comments = useComments(task.card.id);
  const [body, setBody] = useState("");
  const add = useWorkMutation(() => addComment(task.card.id, body));

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{t("commentsTitle")}</h3>
      <ul className="grid gap-3">
        {(comments.data ?? []).map((comment) => (
          <li key={comment.id} className="grid gap-1 text-sm">
            <span className="flex items-center gap-2">
              <PersonChip person={comment.author} />
              <span className="text-muted-foreground text-xs">{formatDateTime(comment.createdAt)}</span>
            </span>
            <p className="whitespace-pre-wrap">{comment.body}</p>
          </li>
        ))}
      </ul>
      {task.can.comment && (
        <div className="grid gap-2">
          <Textarea rows={2} placeholder={t("commentPlaceholder")} value={body} onChange={(event) => setBody(event.target.value)} />
          <div>
            <Button
              size="sm"
              disabled={!body.trim() || add.isPending}
              onClick={() => add.mutate(undefined, { onSuccess: () => setBody(""), onError: (error) => toast.error(errorMessage(error)) })}
            >
              {t("send")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function History({ task }: { task: Task }) {
  const t = useTranslations("ProjectWork");
  const events = useEvents(task.card.id);
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{t("historyTitle")}</h3>
      <ul className="grid gap-1.5 text-sm">
        {(events.data ?? []).map((event) => (
          <EventLine key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}
