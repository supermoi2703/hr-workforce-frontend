"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { declareSkill } from "../api";
import { useSkillCatalog, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { isValidYears, parseYears } from "../rules";
import type { EmployeeSkill } from "../types";
import { LevelPicker } from "./skill-level";
import { SkillPicker } from "./skill-picker";

const FORM_ID = "declare-skill-form";

export type DeclareTarget = { mode: "create" } | { mode: "edit"; skill: EmployeeSkill };

type DeclareSkillDialogProps = {
  /** null = đóng. */
  target: DeclareTarget | null;
  /** Kỹ năng đã khai: không cho khai trùng. */
  declared: EmployeeSkill[];
  onClose: () => void;
};

/** Nhân viên tự khai hoặc sửa một kỹ năng của mình. */
export function DeclareSkillDialog({ target, declared, onClose }: DeclareSkillDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {target && (
          <DeclareForm key={target.mode === "edit" ? target.skill.skillId : "new"} target={target} declared={declared} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeclareForm({ target, declared, onDone }: { target: DeclareTarget; declared: EmployeeSkill[]; onDone: () => void }) {
  const t = useTranslations("Skills.Declare");
  const tCommon = useTranslations("Common");
  const errorMessage = useSkillErrorMessage();
  const catalog = useSkillCatalog();
  const editing = target.mode === "edit" ? target.skill : undefined;

  const schema = useMemo(
    () =>
      z.object({
        skillId: z.string().min(1, t("skillRequired")),
        level: z.number({ error: t("levelRequired") }).int().min(1, t("levelRequired")).max(5),
        yearsExperience: z.string().refine((value) => isValidYears(parseYears(value)), t("yearsInvalid")),
        note: z.string().max(500, t("noteTooLong")),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      skillId: editing?.skillId ?? "",
      // Kỹ năng quản lý thêm hộ chưa có mức tự khai: gợi ý mức quản lý đã chốt.
      level: editing ? (editing.selfLevel ?? editing.level) : 0,
      yearsExperience: editing?.yearsExperience != null ? String(editing.yearsExperience) : "",
      note: editing?.note ?? "",
    },
  });

  const mutation = useSkillMutation((values: Values) =>
    declareSkill(values.skillId, {
      level: values.level,
      yearsExperience: parseYears(values.yearsExperience),
      note: values.note.trim() || null,
    }),
  );

  const activeSkills = useMemo(() => (catalog.data ?? []).filter((s) => s.active), [catalog.data]);
  const declaredReason = useMemo(
    () => new Map(declared.map((s) => [s.skillId, t("alreadyDeclared")])),
    [declared, t],
  );
  const skillId = useWatch({ control: form.control, name: "skillId" });
  const level = useWatch({ control: form.control, name: "level" });
  const selectedSkill = activeSkills.find((s) => s.id === skillId);

  // Đổi mức của kỹ năng đã xác nhận → quay về chờ xác nhận, trừ khi mức mới bằng mức đã chốt (backend làm, ở đây báo trước).
  const losesConfirmation =
    !!editing?.confirmed && level !== (editing.selfLevel ?? editing.level) && level !== editing.confirmedLevel;

  function submit(values: Values) {
    mutation.mutate(values, {
      onSuccess: (result) => {
        toast.success(t(editing ? "saved" : "created", { name: result.skillName }));
        onDone();
      },
      onError: (error) => {
        applyServerFieldErrors(error, form.setError);
      },
    });
  }

  const showAlert = mutation.isError && !(isApiError(mutation.error) && mutation.error.fieldErrors.length > 0);
  const { errors } = form.formState;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? t("editTitle", { name: editing.skillName }) : t("createTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {showAlert && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          {!editing && (
            <Controller
              control={form.control}
              name="skillId"
              render={({ field }) => (
                <Field data-invalid={!!errors.skillId}>
                  <FieldLabel htmlFor="declare-skill">{t("skill")}</FieldLabel>
                  <SkillPicker
                    id="declare-skill"
                    skills={activeSkills}
                    value={selectedSkill}
                    onChange={(skill) => field.onChange(skill.id)}
                    disabled={declaredReason}
                    invalid={!!errors.skillId}
                  />
                  {selectedSkill?.description ? (
                    <FieldDescription>{selectedSkill.description}</FieldDescription>
                  ) : (
                    <FieldDescription>{t("skillHint")}</FieldDescription>
                  )}
                  <FieldError errors={[errors.skillId]} />
                </Field>
              )}
            />
          )}

          <Controller
            control={form.control}
            name="level"
            render={({ field }) => (
              <Field data-invalid={!!errors.level}>
                <FieldLabel id="declare-level-label">{t("level")}</FieldLabel>
                <LevelPicker
                  labelledBy="declare-level-label"
                  value={field.value || null}
                  onChange={field.onChange}
                  invalid={!!errors.level}
                  markedLevel={editing?.confirmed ? editing.confirmedLevel : null}
                  markedLabel={t("confirmedMark")}
                />
                <FieldError errors={[errors.level]} />
              </Field>
            )}
          />

          {losesConfirmation && (
            <Alert>
              <InfoIcon />
              <AlertDescription>{t("losesConfirmation", { level: editing?.confirmedLevel ?? 0 })}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.yearsExperience}>
            <FieldLabel htmlFor="declare-years">{t("years")}</FieldLabel>
            <Input
              id="declare-years"
              inputMode="decimal"
              autoComplete="off"
              className="sm:w-32"
              aria-invalid={!!errors.yearsExperience}
              {...form.register("yearsExperience")}
            />
            <FieldDescription>{t("yearsHint")}</FieldDescription>
            <FieldError errors={[errors.yearsExperience]} />
          </Field>

          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor="declare-note">{t("note")}</FieldLabel>
            <Textarea id="declare-note" rows={2} aria-invalid={!!errors.note} {...form.register("note")} />
            <FieldDescription>{t("noteHint")}</FieldDescription>
            <FieldError errors={[errors.note]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t(editing ? "save" : "create")}
        </Button>
      </DialogFooter>
    </>
  );
}
