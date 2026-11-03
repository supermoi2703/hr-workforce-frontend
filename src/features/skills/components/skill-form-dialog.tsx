"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { createSkill, updateSkill } from "../api";
import { isSkillErrorCode } from "../error-messages";
import { useSkillErrorMessage, useSkillMutation } from "../hooks";
import { SKILL_CODE_PATTERN } from "../rules";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "../types";

const FORM_ID = "skill-form";

/** null = đóng; "create" = thêm mới; Skill = sửa. */
export type SkillFormTarget = "create" | Skill | null;

/** Thêm / sửa một kỹ năng trong danh mục (skill:manage). */
export function SkillFormDialog({ target, onClose }: { target: SkillFormTarget; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && <SkillForm key={target === "create" ? "new" : target.id} skill={target === "create" ? undefined : target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SkillForm({ skill, onDone }: { skill: Skill | undefined; onDone: () => void }) {
  const t = useTranslations("Skills.Form");
  const tCategory = useTranslations("Skills.Categories");
  const tCommon = useTranslations("Common");
  const errorMessage = useSkillErrorMessage();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("nameRequired")).max(100, t("nameTooLong")),
        code: z.string().trim().regex(SKILL_CODE_PATTERN, t("codeInvalid")),
        category: z.enum(SKILL_CATEGORIES, { error: t("categoryRequired") }),
        description: z.string().max(500, t("descriptionTooLong")),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: skill?.name ?? "",
      code: skill?.code ?? "",
      category: skill?.category ?? ("" as SkillCategory),
      description: skill?.description ?? "",
    },
  });

  const mutation = useSkillMutation((values: Values) => {
    const body = { code: values.code, name: values.name, category: values.category, description: values.description.trim() || null };
    return skill ? updateSkill(skill.id, body) : createSkill(body);
  });

  function submit(values: Values) {
    mutation.mutate(values, {
      onSuccess: (result) => {
        toast.success(t(skill ? "saved" : "created", { name: result.name }));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        if (isSkillErrorCode(error, "SKILL_CODE_EXISTS")) {
          form.setError("code", { type: "server", message: errorMessage(error) }, { shouldFocus: true });
        } else if (isSkillErrorCode(error, "SKILL_NAME_EXISTS")) {
          form.setError("name", { type: "server", message: errorMessage(error) }, { shouldFocus: true });
        }
      },
    });
  }

  const fieldError =
    isSkillErrorCode(mutation.error, "SKILL_CODE_EXISTS") ||
    isSkillErrorCode(mutation.error, "SKILL_NAME_EXISTS") ||
    (isApiError(mutation.error) && mutation.error.fieldErrors.length > 0);
  const { errors } = form.formState;
  const categoryItems = Object.fromEntries(SKILL_CATEGORIES.map((c) => [c, tCategory(c)]));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{skill ? t("editTitle", { name: skill.name }) : t("createTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {mutation.isError && !fieldError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="skill-name">{t("name")}</FieldLabel>
            <Input id="skill-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="skill-code">{t("code")}</FieldLabel>
            <Input id="skill-code" autoComplete="off" className="font-mono uppercase" aria-invalid={!!errors.code} {...form.register("code")} />
            <FieldDescription>{skill ? t("codeEditHint") : t("codeHint")}</FieldDescription>
            <FieldError errors={[errors.code]} />
          </Field>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="skill-category">{t("category")}</FieldLabel>
                <Select value={field.value || null} onValueChange={(value) => value && field.onChange(value)} items={categoryItems}>
                  <SelectTrigger id="skill-category" className="w-full" aria-invalid={!!errors.category}>
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryItems[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.category]} />
              </Field>
            )}
          />
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="skill-description">{t("descriptionLabel")}</FieldLabel>
            <Textarea id="skill-description" rows={2} aria-invalid={!!errors.description} {...form.register("description")} />
            <FieldDescription>{t("descriptionHint")}</FieldDescription>
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t(skill ? "save" : "create")}
        </Button>
      </DialogFooter>
    </>
  );
}
