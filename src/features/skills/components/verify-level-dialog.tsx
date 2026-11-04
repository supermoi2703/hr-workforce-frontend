"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { setConfirmedLevel } from "../api";
import { isSkillErrorCode } from "../error-messages";
import { useSkillCatalog, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { requiresConfirmNote } from "../rules";
import type { EmployeeSkill, Skill, SkillLevel } from "../types";
import { LevelPicker } from "./skill-level";
import { SkillPicker } from "./skill-picker";

const NOTE_MAX = 500;

export type VerifyTarget = {
  employeeId: string;
  fullName: string;
  /** Có = chốt mức khác cho kỹ năng đã khai; không = thêm hộ kỹ năng (chọn trong danh mục). */
  skill?: EmployeeSkill;
  /** Kỹ năng người đó đã có: không cho thêm hộ trùng. */
  existing?: EmployeeSkill[];
};

/**
 * Quản lý / HR chốt mức kỹ năng cho người khác (không đổi mức tự khai, số năm, ghi chú của họ). Chốt khác mức tự khai
 * thì phải ghi lý do để nhân viên biết vì sao (docs/policies/skill.md mục 4).
 */
export function VerifyLevelDialog({ target, onClose }: { target: VerifyTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {target && <VerifyForm key={`${target.employeeId}-${target.skill?.skillId ?? "new"}`} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function VerifyForm({ target, onDone }: { target: VerifyTarget; onDone: () => void }) {
  const t = useTranslations("Skills.Verify");
  const tCommon = useTranslations("Common");
  const errorMessage = useSkillErrorMessage();
  const catalog = useSkillCatalog();
  const existingSkill = target.skill;
  const [picked, setPicked] = useState<Skill | undefined>();
  const [level, setLevel] = useState<SkillLevel | null>(
    existingSkill ? ((existingSkill.confirmedLevel ?? existingSkill.selfLevel) as SkillLevel | null) : null,
  );
  // Đang sửa mức đã chốt: điền sẵn ghi chú cũ để sửa tiếp thay vì viết lại.
  const [note, setNote] = useState(existingSkill?.confirmedNote ?? "");
  const [submitted, setSubmitted] = useState(false);

  const activeSkills = useMemo(() => (catalog.data ?? []).filter((s) => s.active), [catalog.data]);
  const existingReason = useMemo(
    () => new Map((target.existing ?? []).map((s) => [s.skillId, t("alreadyHas")])),
    [target.existing, t],
  );

  const mutation = useSkillMutation(({ skillId, value, text }: { skillId: string; value: number; text: string | null }) =>
    setConfirmedLevel(target.employeeId, skillId, value, text),
  );

  const skillId = existingSkill?.skillId ?? picked?.id;
  const skillName = existingSkill?.skillName ?? picked?.name ?? "";
  const noteRequired = requiresConfirmNote(existingSkill?.selfLevel, level);
  const trimmed = note.trim();
  const noteMissing = noteRequired && !trimmed;
  const noteTooLong = trimmed.length > NOTE_MAX;
  const serverNoteError = isSkillErrorCode(mutation.error, "SKILL_CONFIRM_NOTE_REQUIRED");

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!skillId || !level || noteMissing || noteTooLong) return;
    mutation.mutate(
      { skillId, value: level, text: trimmed || null },
      {
        onSuccess: () => {
          toast.success(t("saved", { name: skillName, person: target.fullName, level }));
          onDone();
        },
      },
    );
  }

  const noteInvalid = (submitted && (noteMissing || noteTooLong)) || serverNoteError;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existingSkill ? t("adjustTitle", { name: existingSkill.skillName }) : t("addTitle")}</DialogTitle>
        <DialogDescription>{t(existingSkill ? "adjustDescription" : "addDescription", { person: target.fullName })}</DialogDescription>
      </DialogHeader>

      {mutation.isError && !serverNoteError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}

      <form id="verify-skill-form" onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          {!existingSkill && (
            <Field data-invalid={submitted && !picked}>
              <FieldLabel htmlFor="verify-skill">{t("skill")}</FieldLabel>
              <SkillPicker
                id="verify-skill"
                skills={activeSkills}
                value={picked}
                onChange={setPicked}
                disabled={existingReason}
                invalid={submitted && !picked}
              />
              <FieldDescription>{t("addHint")}</FieldDescription>
              {submitted && !picked && <FieldError>{t("skillRequired")}</FieldError>}
            </Field>
          )}
          <Field data-invalid={submitted && !level}>
            <FieldLabel id="verify-level-label">{t("level")}</FieldLabel>
            <LevelPicker
              labelledBy="verify-level-label"
              value={level}
              onChange={setLevel}
              invalid={submitted && !level}
              markedLevel={existingSkill?.selfLevel}
              markedLabel={t("selfMark")}
            />
            {submitted && !level && <FieldError>{t("levelRequired")}</FieldError>}
          </Field>
          {existingSkill?.note && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
              <span className="font-medium text-foreground">{t("employeeNote")}: </span>
              {existingSkill.note}
            </p>
          )}
          <Field data-invalid={noteInvalid}>
            <FieldLabel htmlFor="verify-note">
              {t("note")}
              {!noteRequired && <span className="font-normal text-muted-foreground"> {t("optional")}</span>}
            </FieldLabel>
            <Textarea
              id="verify-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={noteInvalid}
              placeholder={noteRequired ? t("notePlaceholderRequired") : t("notePlaceholder")}
            />
            <FieldDescription>{noteRequired ? t("noteRequiredHint") : t("noteHint")}</FieldDescription>
            {noteInvalid && (
              <FieldError>{noteTooLong ? t("noteTooLong", { max: NOTE_MAX }) : t("noteRequired")}</FieldError>
            )}
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form="verify-skill-form" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
