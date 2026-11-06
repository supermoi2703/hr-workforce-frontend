"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createTask, updateTask } from "../work-api";
import { useProjectMembers } from "../hooks";
import { useWorkErrorMessage, useWorkMutation, useSkillOptions } from "../work-hooks";
import { formatMinutes, parseHours } from "../work-rules";
import type { Project } from "../types";
import { TASK_PRIORITIES, TASK_TYPES, type Task, type TaskPriority, type TaskType } from "../work-types";
import { SimpleSelect } from "./simple-select";

const NOBODY = "NOBODY";

/** Tạo hoặc sửa việc. Kỹ năng cần có là đầu vào của gợi ý giao lại. */
export function TaskFormDialog({ project, task, onClose }: { project: Project; task?: Task; onClose: () => void }) {
  const t = useTranslations("ProjectWork");
  const tCommon = useTranslations("Common");
  const errorMessage = useWorkErrorMessage();
  const members = useProjectMembers(project.id);
  const skills = useSkillOptions();
  const [title, setTitle] = useState(task?.card.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState<TaskType>(task?.card.type ?? "TASK");
  const [priority, setPriority] = useState<TaskPriority>(task?.card.priority ?? "MEDIUM");
  const [assignee, setAssignee] = useState(task?.card.assignee?.id ?? NOBODY);
  const [dueDate, setDueDate] = useState(task?.card.dueDate ?? "");
  const [estimate, setEstimate] = useState(task?.card.estimateMinutes != null ? String(task.card.estimateMinutes / 60) : "");
  const [skillIds, setSkillIds] = useState<string[]>(task?.skillIds ?? []);
  const estimateMinutes = parseHours(estimate);
  const validEstimate = !estimate.trim() || estimateMinutes != null;

  const mutation = useWorkMutation(() => {
    const body = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assigneeId: assignee === NOBODY ? null : assignee,
      parentId: task?.parent?.taskId ?? null,
      dueDate: dueDate || null,
      estimateMinutes,
      skillIds,
    };
    return task ? updateTask(task.card.id, { ...body, version: task.card.version }) : createTask(project.id, body);
  });

  const people = (members.data ?? []).filter((member) => member.role !== "OBSERVER");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? t("editTask", { key: task.card.key }) : t("newTask")}</DialogTitle>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="task-title">{t("taskTitle")}</FieldLabel>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="task-type">{t("typeLabel")}</FieldLabel>
              <SimpleSelect
                id="task-type"
                className="w-full"
                value={type}
                onChange={(value) => setType(value as TaskType)}
                options={TASK_TYPES.map((value) => ({ value, label: t(`type.${value}`) }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-priority">{t("priorityLabel")}</FieldLabel>
              <SimpleSelect
                id="task-priority"
                className="w-full"
                value={priority}
                onChange={(value) => setPriority(value as TaskPriority)}
                options={TASK_PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-assignee">{t("assignee")}</FieldLabel>
              <SimpleSelect
                id="task-assignee"
                className="w-full"
                value={assignee}
                onChange={setAssignee}
                options={[{ value: NOBODY, label: t("unassigned") }, ...people.map((member) => ({ value: member.employee.id, label: member.employee.fullName }))]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-due">{t("dueDate")}</FieldLabel>
              <Input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
            <Field data-invalid={!validEstimate}>
              <FieldLabel htmlFor="task-estimate">{t("estimateHours")}</FieldLabel>
              <Input id="task-estimate" inputMode="decimal" value={estimate} onChange={(event) => setEstimate(event.target.value)} />
              <FieldDescription>{estimateMinutes != null ? formatMinutes(estimateMinutes) : t("estimateHint")}</FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("requiredSkills")}</FieldLabel>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {(skills.data ?? []).map((skill) => {
                const selected = skillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn("rounded-full border px-2.5 py-0.5 text-xs", selected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}
                    onClick={() => setSkillIds(selected ? skillIds.filter((id) => id !== skill.id) : [...skillIds, skill.id])}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-description">{t("descriptionLabel")}</FieldLabel>
            <Textarea id="task-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={!title.trim() || !validEstimate || mutation.isPending}
            onClick={() => mutation.mutate(undefined, { onSuccess: onClose, onError: (error) => toast.error(errorMessage(error)) })}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
