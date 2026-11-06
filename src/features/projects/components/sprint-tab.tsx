"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate, todayIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { closeSprint, createSprint, moveTaskToSprint, startSprint } from "../work-api";
import { useBoard, useWorkErrorMessage, useWorkMutation, useSprintCapacity, useSprints } from "../work-hooks";
import { formatMinutes, percent } from "../work-rules";
import type { Project } from "../types";
import type { Sprint, TaskCard } from "../work-types";
import { PersonChip, PriorityIcon, TypeIcon } from "./badges";
import { SimpleSelect } from "./simple-select";

const BACKLOG = "BACKLOG";

/** S6: sprint và backlog. Điểm khác Jira là thanh năng lực lấy từ lịch và đơn nghỉ đã duyệt. */
export function SprintTab({ project, onOpenTask }: { project: Project; onOpenTask: (key: string) => void }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const sprints = useSprints(project.id, true);
  const board = useBoard(project.id, {});
  const [creating, setCreating] = useState(false);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const start = useWorkMutation(startSprint);
  const close = useWorkMutation(closeSprint);
  const move = useWorkMutation(({ task, sprintId }: { task: TaskCard; sprintId: string | null }) => moveTaskToSprint(task.id, sprintId, task.version));

  if (sprints.isPending || board.isPending) return <LoadingState />;
  if (sprints.isError) return <ErrorState error={sprints.error} onRetry={() => sprints.refetch()} />;
  if (board.isError) return <ErrorState error={board.error} onRetry={() => board.refetch()} />;

  const open = sprints.data.filter((sprint) => sprint.status !== "CLOSED");
  const options = [{ value: BACKLOG, label: t("backlog") }, ...open.map((sprint) => ({ value: sprint.id, label: sprint.name }))];
  const openTasks = board.data.filter((task) => task.status !== "DONE");
  const row = (task: TaskCard) => (
    <li key={task.id} className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
      <TypeIcon type={task.type} />
      <button type="button" className="text-primary font-mono hover:underline" onClick={() => onOpenTask(task.key)}>
        {task.key}
      </button>
      <PriorityIcon priority={task.priority} />
      <span className="min-w-32 flex-1 truncate">{task.title}</span>
      <PersonChip person={task.assignee} emptyLabel={t("unassigned")} />
      <span className="text-muted-foreground w-12 text-right tabular-nums">{formatMinutes(task.estimateMinutes)}</span>
      {project.can.manageSprint && (
        <SimpleSelect
          size="sm"
          className="w-36"
          value={task.sprintId ?? BACKLOG}
          onChange={(value) => move.mutate({ task, sprintId: value === BACKLOG ? null : value }, fail)}
          options={options}
        />
      )}
    </li>
  );

  return (
    <div className="grid gap-4">
      {project.can.manageSprint && (
        <div>
          <Button variant="outline" onClick={() => setCreating(true)}>
            <PlusIcon /> {t("newSprint")}
          </Button>
        </div>
      )}
      {open.map((sprint) => (
        <Card key={sprint.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {sprint.name}
              <Badge variant={sprint.status === "ACTIVE" ? "info" : "secondary"}>{t(`sprintStatus.${sprint.status}`)}</Badge>
              <span className="text-muted-foreground text-sm font-normal">
                {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)} · {t("sprintDone", { done: sprint.doneCount, total: sprint.taskCount })}
              </span>
              {project.can.manageSprint && sprint.status === "PLANNED" && (
                <Button size="sm" className="ml-auto" onClick={() => start.mutate(sprint.id, fail)}>
                  {t("startSprint")}
                </Button>
              )}
              {project.can.manageSprint && sprint.status === "ACTIVE" && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => close.mutate(sprint.id, fail)}>
                  {t("closeSprint")}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ul className="divide-y">{openTasks.filter((task) => task.sprintId === sprint.id).map(row)}</ul>
            <SprintCapacityBars sprint={sprint} />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>{t("backlog")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">{openTasks.filter((task) => !task.sprintId).map(row)}</ul>
        </CardContent>
      </Card>
      {creating && <SprintDialog project={project} onClose={() => setCreating(false)} />}
    </div>
  );
}

function SprintCapacityBars({ sprint }: { sprint: Sprint }) {
  const t = useTranslations("ProjectWork");
  const capacity = useSprintCapacity(sprint.id);
  return (
    <div className="grid content-start gap-2">
      <p className="text-muted-foreground text-sm">{t("sprintCapacity")}</p>
      {(capacity.data ?? []).map((row) => (
        <div key={row.person.id} className="grid gap-1 text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{row.person.fullName}</span>
            <span className={cn("tabular-nums", row.overloaded && "text-destructive font-medium")}>
              {formatMinutes(row.assignedMinutes)} / {formatMinutes(row.capacityMinutes)}
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div className={cn("h-full", row.overloaded ? "bg-destructive" : "bg-primary")} style={{ width: `${percent(row.assignedMinutes, row.capacityMinutes)}%` }} />
          </div>
          {row.leaveDays > 0 && <span className="text-muted-foreground text-xs">{t("leaveDays", { days: row.leaveDays })}</span>}
        </div>
      ))}
    </div>
  );
}

function SprintDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const t = useTranslations("ProjectWork");
  const tCommon = useTranslations("Common");
  const errorMessage = useWorkErrorMessage();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState("");
  const mutation = useWorkMutation(() => createSprint(project.id, { name: name.trim(), goal: null, startDate, endDate }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("newSprint")}</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="sprint-name">{t("name")}</FieldLabel>
            <Input id="sprint-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sprint-start">{t("startDate")}</FieldLabel>
            <Input id="sprint-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sprint-end">{t("endDate")}</FieldLabel>
            <Input id="sprint-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={!name.trim() || !endDate || mutation.isPending}
            onClick={() => mutation.mutate(undefined, { onSuccess: onClose, onError: (error) => toast.error(errorMessage(error)) })}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
