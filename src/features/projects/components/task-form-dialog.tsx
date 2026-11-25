"use client";

import { useState, type ReactNode } from "react";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { createTask, getAssignPreview, updateTask } from "../work-api";
import { useProjectMembers } from "../hooks";
import { useAssignPreview, useSkillOptions, useWorkCategories, useWorkErrorMessage, useWorkMutation } from "../work-hooks";
import { useAssistantStatus } from "../ai/hooks";
import { TaskProfileHint } from "../ai/task-profile-hint";
import type { TaskProfile } from "../ai/types";
import {
  applyAiProfile,
  applyCategory,
  applySuggestion,
  categorySuggestion,
  dateRangeValid,
  differsFromSuggestion,
  formatMinutes,
  minutesToHoursText,
  needsConfirm,
  parseHours,
  scheduleInfo,
  type CategoryDraft,
} from "../work-rules";
import type { Project } from "../types";
import {
  TASK_PRIORITIES,
  TASK_TYPES,
  type AssignPreviewInput,
  type Task,
  type TaskPriority,
  type TaskSkillInput,
  type TaskType,
  type WorkCategory,
} from "../work-types";
import { AssignLoadNotice } from "./load-summary";
import { SimpleSelect } from "./simple-select";
import { TaskSkillsField } from "./task-skills-field";
import { WorkCategorySelect } from "./work-category-select";

const NOBODY = "NOBODY";

/** Giá trị điền sẵn khi tạo việc mới (trợ lý phân bổ AI: "Tạo task với yêu cầu này"). Kỹ năng coi như PM đã chọn. */
export type TaskFormInitial = {
  title?: string;
  estimateMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  skills?: TaskSkillInput[];
};

/**
 * Tạo hoặc sửa việc. Nhóm công việc điền sẵn giờ và kỹ năng (PM sửa được); ngày bắt đầu, hạn để trống thì lấy theo
 * sprint; kỹ năng kèm mức tối thiểu là đầu vào của gợi ý người (workload, backend README module project mục 7.1).
 */
export function TaskFormDialog({
  project,
  task,
  initial,
  onClose,
}: {
  project: Project;
  task?: Task;
  initial?: TaskFormInitial;
  onClose: () => void;
}) {
  const t = useTranslations("ProjectWork");
  const tCommon = useTranslations("Common");
  const tLoad = useTranslations("Workload");
  const errorMessage = useWorkErrorMessage();
  const members = useProjectMembers(project.id);
  const skillOptions = useSkillOptions();
  const categories = useWorkCategories();
  const aiEnabled = useAssistantStatus();
  const mode = task ? "edit" : "create";

  const start = task ? undefined : initial;
  const [title, setTitle] = useState(task?.card.title ?? start?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState<TaskType>(task?.card.type ?? "TASK");
  const [priority, setPriority] = useState<TaskPriority>(task?.card.priority ?? "MEDIUM");
  const [assignee, setAssignee] = useState(task?.card.assignee?.id ?? NOBODY);
  const [startDate, setStartDate] = useState(task?.card.startDate ?? start?.startDate ?? "");
  const [dueDate, setDueDate] = useState(task?.card.dueDate ?? start?.dueDate ?? "");
  const [categoryId, setCategoryId] = useState(task?.workCategory?.id ?? "");
  const [draft, setDraft] = useState<CategoryDraft>(() =>
    task
      ? {
          estimate: task.card.estimateMinutes != null ? String(task.card.estimateMinutes / 60) : "",
          skills: task.skills.map((skill) => ({ skillId: skill.id, minLevel: skill.minLevel })),
          estimateTouched: false,
          skillsTouched: false,
        }
      : {
          estimate: start?.estimateMinutes != null ? minutesToHoursText(start.estimateMinutes) : "",
          skills: start?.skills ?? [],
          estimateTouched: start?.estimateMinutes != null,
          skillsTouched: (start?.skills?.length ?? 0) > 0,
        },
  );
  const [common, setCommon] = useState(false);

  const category = (categories.data ?? []).find((item) => item.id === categoryId) ?? null;
  const estimateMinutes = parseHours(draft.estimate);
  const validEstimate = !draft.estimate.trim() || estimateMinutes != null;
  const validDates = dateRangeValid(startDate, dueDate);
  const showSuggestion = !!category && differsFromSuggestion(draft, category);
  const [confirming, setConfirming] = useState(false);

  const mutation = useWorkMutation(() => {
    const body = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assigneeId: common || assignee === NOBODY ? null : assignee,
      common,
      parentId: task?.parent?.taskId ?? null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      workCategoryId: common ? null : categoryId || null,
      estimateMinutes,
      skills: common ? [] : draft.skills,
    };
    return task ? updateTask(task.card.id, { ...body, version: task.card.version }) : createTask(project.id, body);
  });

  function chooseCategory(next: WorkCategory | null) {
    setCategoryId(next?.id ?? "");
    setDraft((current) => applyCategory(current, next, mode));
  }

  // Gợi ý AI (trợ lý phân bổ, phần A): đặt nhóm mà không chạy luật điền sẵn của nhóm, rồi thay kỹ năng bằng kỹ năng AI.
  function applyProfile(profile: TaskProfile) {
    if (profile.category) setCategoryId(profile.category.id);
    setDraft((current) => applyAiProfile(current, profile));
  }

  const people = (members.data ?? []).filter((member) => member.role !== "OBSERVER");
  const assigneeName = people.find((member) => member.employee.id === assignee)?.employee.fullName ?? "";
  // Xem trước tải của người được chọn (workload bước 3): chỉ khi đã chọn người và form hợp lệ. Không chặn lưu.
  const previewInput: AssignPreviewInput | null =
    !common && assignee !== NOBODY && validDates && validEstimate
      ? {
          taskId: task?.card.id ?? null,
          employeeId: assignee,
          estimateMinutes,
          startDate: startDate || null,
          dueDate: dueDate || null,
          sprintId: task?.card.sprintId ?? null,
        }
      : null;
  const preview = useAssignPreview(project.id, previewInput);
  // Chỉ hỏi xác nhận khi đổi người (hoặc việc mới): sửa việc của người đã đỏ không hỏi lại mỗi lần lưu.
  const assigneeChanged = !task || (task.card.assignee?.id ?? NOBODY) !== assignee;

  function save() {
    mutation.mutate(undefined, { onSuccess: onClose, onError: (error) => toast.error(errorMessage(error)) });
  }

  async function submit() {
    if (previewInput && assigneeChanged) {
      try {
        // Tính lại với đúng giá trị lúc bấm Lưu (ô cảnh báo có thể còn chờ 400 ms)
        if (needsConfirm(await getAssignPreview(project.id, previewInput))) {
          setConfirming(true);
          return;
        }
      } catch {
        // Không xem trước được thì vẫn lưu: tải chỉ để cảnh báo
      }
    }
    save();
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? t("editTask", { key: task.card.key }) : t("newTask")}</DialogTitle>
          <DialogDescription>{t("taskFormDescription")}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-5">
          <Section>
            {!task && (
              <label className="flex items-center gap-2 text-sm" title={t("commonHint")}>
                <Checkbox checked={common} onCheckedChange={(checked) => setCommon(checked === true)} />
                {t("common")}
              </label>
            )}
            <Field>
              <FieldLabel htmlFor="task-title">{t("taskTitle")}</FieldLabel>
              <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-description">{t("descriptionLabel")}</FieldLabel>
              <Textarea id="task-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
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
            </div>
          </Section>

          <Section title={common ? t("sectionWork") : t("sectionCategory")}>
            {!common && aiEnabled && (
              <TaskProfileHint projectId={project.id} title={title} description={description} onApply={applyProfile} />
            )}
            {!common && (
              <Field>
                <FieldLabel htmlFor="task-category">{t("workCategory")}</FieldLabel>
                <WorkCategorySelect id="task-category" value={categoryId} onChange={chooseCategory} categories={categories.data ?? []} />
                {category && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <SparklesIcon className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 text-muted-foreground">
                      {category.skills.length > 0
                        ? t("suggestion", { hours: formatMinutes(category.defaultMinutes), skills: suggestionSkills(category, skillOptions.data ?? []) })
                        : t("suggestionHoursOnly", { hours: formatMinutes(category.defaultMinutes) })}
                    </span>
                    {showSuggestion && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-primary/40 text-primary"
                        onClick={() => setDraft((current) => applySuggestion(current, category))}
                      >
                        {t("applySuggestion")}
                      </Button>
                    )}
                  </div>
                )}
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!validEstimate}>
                <FieldLabel htmlFor="task-estimate">{t("estimateHours")}</FieldLabel>
                <Input
                  id="task-estimate"
                  inputMode="decimal"
                  value={draft.estimate}
                  onChange={(event) => setDraft((current) => ({ ...current, estimate: event.target.value, estimateTouched: true }))}
                />
                <FieldDescription>{estimateMinutes != null ? formatMinutes(estimateMinutes) : t("estimateHint")}</FieldDescription>
              </Field>
              {!common && (
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
              )}
            </div>
            {previewInput && (
              <AssignLoadNotice preview={preview.data} name={assigneeName} pending={preview.isFetching && !preview.data} />
            )}
          </Section>

          <Section title={t("sectionDates")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!validDates}>
                <FieldLabel htmlFor="task-start">{t("startDate")}</FieldLabel>
                <Input id="task-start" type="date" value={startDate} max={dueDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field data-invalid={!validDates}>
                <FieldLabel htmlFor="task-due">{t("dueDate")}</FieldLabel>
                <Input id="task-due" type="date" value={dueDate} min={startDate || undefined} onChange={(event) => setDueDate(event.target.value)} />
              </Field>
            </div>
            {validDates ? (
              <FieldDescription>{dateHint(t, task, startDate, dueDate)}</FieldDescription>
            ) : (
              <FieldError>{t("datesInvalid")}</FieldError>
            )}
          </Section>

          {!common && (
            <Section title={t("requiredSkills")} titleId="task-skills-label">
              <TaskSkillsField
                labelledBy="task-skills-label"
                value={draft.skills}
                options={skillOptions.data ?? []}
                onChange={(skills) => setDraft((current) => ({ ...current, skills, skillsTouched: true }))}
              />
            </Section>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={!title.trim() || !validEstimate || !validDates || mutation.isPending}
            onClick={() => void submit()}
          >
            {t("save")}
          </Button>
        </DialogFooter>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={tLoad("confirmTitle", { name: assigneeName })}
          description={tLoad("confirmDescription", { name: assigneeName })}
          confirmLabel={tLoad("confirmAction")}
          destructive
          onConfirm={() =>
            mutation
              .mutateAsync(undefined)
              .then(onClose)
              .catch((failure) => {
                toast.error(errorMessage(failure));
                throw failure;
              })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/** Một khối của form: tiêu đề nhỏ, ngăn với khối trên bằng đường kẻ. */
function Section({ title, titleId, children }: { title?: string; titleId?: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      {title && (
        <h3 id={titleId} className="text-sm font-medium">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/** "Java ≥ 2 · SQL ≥ 2" từ kỹ năng gợi ý của nhóm. */
function suggestionSkills(category: WorkCategory, options: { id: string; name: string }[]): string {
  const names = new Map(options.map((option) => [option.id, option.name]));
  return categorySuggestion(category)
    .skills.map((skill) => `${names.get(skill.skillId) ?? "?"} ≥ ${skill.minLevel}`)
    .join(" · ");
}

/**
 * Dòng giải thích dưới hai ô ngày. Việc đang ở sprint: nêu đúng ngày nào sẽ lấy theo sprint (chỉ ô đang để trống); còn
 * lại là câu chung.
 */
function dateHint(t: ReturnType<typeof useTranslations<"ProjectWork">>, task: Task | undefined, startDate: string, dueDate: string): string {
  const card = task?.card;
  if (!card?.sprintId) return t("dateHint");
  const info = scheduleInfo(card);
  const startFromSprint = !startDate && info.startFromSprint;
  const endFromSprint = !dueDate && info.endFromSprint;
  if (startFromSprint && endFromSprint) return t("dateHintSprint", { from: formatDate(info.start), to: formatDate(info.end) });
  if (startFromSprint) return t("dateHintSprintStart", { date: formatDate(info.start) });
  if (endFromSprint) return t("dateHintSprintEnd", { date: formatDate(info.end) });
  return t("dateHint");
}
