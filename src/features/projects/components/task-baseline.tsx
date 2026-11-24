"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format";
import { applyServerFieldErrors } from "@/lib/forms";
import { taskBaselineSchema } from "../task-baseline-schema";
import { updateTaskBaseline } from "../work-api";
import { useWorkErrorMessage, useWorkMutation } from "../work-hooks";
import { formatMinutes } from "../work-rules";
import type { Task, TaskBaseline, TaskBaselineInput } from "../work-types";

export function TaskBaselineSection({ task }: { task: Task }) {
  const t = useTranslations("ProjectWork");
  const [editing, setEditing] = useState(false);
  const { baseline } = task;

  return (
    <section className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("baseline.title")}</h3>
        {baseline?.canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t("baseline.change")}
          </Button>
        ) : null}
      </div>
      {baseline?.setAt ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("estimateHours")}</dt>
          <dd className="tabular-nums">{formatMinutes(baseline.estimateMinutes)}</dd>
          <dt className="text-muted-foreground">{t("dueDate")}</dt>
          <dd>{formatDate(baseline.dueDate)}</dd>
          <dt className="text-muted-foreground">{t("baseline.setAt")}</dt>
          <dd>{formatDateTime(baseline.setAt)}</dd>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{t("baseline.empty")}</p>
      )}
      {editing && baseline?.canEdit ? (
        <TaskBaselineDialog taskId={task.card.id} baseline={baseline} onClose={() => setEditing(false)} />
      ) : null}
    </section>
  );
}

function TaskBaselineDialog({ taskId, baseline, onClose }: { taskId: string; baseline: TaskBaseline; onClose: () => void }) {
  const t = useTranslations("ProjectWork");
  const common = useTranslations("Common");
  const errorMessage = useWorkErrorMessage();
  const schema = taskBaselineSchema({
    estimateInvalid: t("baseline.estimateInvalid"),
    dueDateInvalid: t("baseline.dueDateInvalid"),
    reasonRequired: t("Errors.TASK_BASELINE_REASON_REQUIRED"),
    reasonTooLong: t("baseline.reasonTooLong"),
  });
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      estimateMinutes: baseline.estimateMinutes == null ? "" : String(baseline.estimateMinutes / 60),
      dueDate: baseline.dueDate ?? "",
      reason: "",
    },
  });
  const { dirtyFields, errors } = form.formState;
  const mutation = useWorkMutation((body: TaskBaselineInput) => updateTaskBaseline(taskId, body));

  const submit = form.handleSubmit(({ estimateMinutes, dueDate, reason }) => {
    if (mutation.isPending) return;
    mutation.mutate(
      {
        estimateMinutes: dirtyFields.estimateMinutes ? estimateMinutes : undefined,
        dueDate: dirtyFields.dueDate ? dueDate : undefined,
        reason,
      },
      {
        onSuccess: onClose,
        onError: (error) => {
          if (!applyServerFieldErrors(error, form.setError)) toast.error(errorMessage(error));
        },
      },
    );
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("baseline.change")}</DialogTitle>
          <DialogDescription>{t("baseline.hint")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.estimateMinutes}>
              <FieldLabel htmlFor="baseline-estimate">{t("estimateHours")}</FieldLabel>
              <Input id="baseline-estimate" inputMode="decimal" aria-invalid={!!errors.estimateMinutes} {...form.register("estimateMinutes")} />
              <FieldError errors={[errors.estimateMinutes]} />
            </Field>
            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel htmlFor="baseline-due-date">{t("dueDate")}</FieldLabel>
              <Input id="baseline-due-date" type="date" aria-invalid={!!errors.dueDate} {...form.register("dueDate")} />
              <FieldError errors={[errors.dueDate]} />
            </Field>
            <Field data-invalid={!!errors.reason}>
              <FieldLabel htmlFor="baseline-reason">{t("baseline.reason")}</FieldLabel>
              <Textarea id="baseline-reason" required aria-invalid={!!errors.reason} {...form.register("reason")} />
              <FieldError errors={[errors.reason]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>{common("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
