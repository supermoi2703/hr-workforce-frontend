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
import { setConfirmedLevel } from "../api";
import { useSkillCatalog, useSkillErrorMessage, useSkillMutation } from "../hooks";
import type { EmployeeSkill, Skill, SkillLevel } from "../types";
import { LevelPicker } from "./skill-level";
import { SkillPicker } from "./skill-picker";

export type VerifyTarget = {
  employeeId: string;
  fullName: string;
  /** Có = chốt mức khác cho kỹ năng đã khai; không = thêm hộ kỹ năng (chọn trong danh mục). */
  skill?: EmployeeSkill;
  /** Kỹ năng người đó đã có: không cho thêm hộ trùng. */
  existing?: EmployeeSkill[];
};

/** Quản lý / HR chốt mức kỹ năng cho người khác (không đổi mức tự khai, số năm, ghi chú của họ). */
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
  const [submitted, setSubmitted] = useState(false);

  const activeSkills = useMemo(() => (catalog.data ?? []).filter((s) => s.active), [catalog.data]);
  const existingReason = useMemo(
    () => new Map((target.existing ?? []).map((s) => [s.skillId, t("alreadyHas")])),
    [target.existing, t],
  );

  const mutation = useSkillMutation(({ skillId, value }: { skillId: string; value: number }) =>
    setConfirmedLevel(target.employeeId, skillId, value),
  );

  const skillId = existingSkill?.skillId ?? picked?.id;
  const skillName = existingSkill?.skillName ?? picked?.name ?? "";

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!skillId || !level) return;
    mutation.mutate(
      { skillId, value: level },
      {
        onSuccess: () => {
          toast.success(t("saved", { name: skillName, person: target.fullName, level }));
          onDone();
        },
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existingSkill ? t("adjustTitle", { name: existingSkill.skillName }) : t("addTitle")}</DialogTitle>
        <DialogDescription>{t(existingSkill ? "adjustDescription" : "addDescription", { person: target.fullName })}</DialogDescription>
      </DialogHeader>

      {mutation.isError && (
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
