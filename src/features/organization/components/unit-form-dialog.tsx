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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { createDepartment, createTeam, updateDepartment, updateTeam } from "../api";
import { getOrgError, isCodeExistsError } from "../error-messages";
import { useOrgAdminMutation } from "../hooks";
import { UNIT_CODE_PATTERN } from "../rules";

const FORM_ID = "org-unit-form";

export type UnitFormTarget =
  | { kind: "department"; mode: "create" }
  | { kind: "department"; mode: "edit"; id: string; code: string; name: string; executive: boolean }
  | { kind: "team"; mode: "create"; departmentId: string; departmentName: string }
  | { kind: "team"; mode: "edit"; id: string; code: string; name: string; departmentId: string; departmentName: string };

type UnitFormDialogProps = {
  /** null = đóng. */
  target: UnitFormTarget | null;
  onClose: () => void;
};

/** Tạo / sửa phòng ban hoặc team (cần org:manage). Team không đổi được phòng ban (backend chặn). */
export function UnitFormDialog({ target, onClose }: UnitFormDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* key: mở cho đơn vị khác thì dựng form mới với giá trị mới */}
        {target && <UnitForm key={target.mode === "edit" ? target.id : `new-${target.kind}`} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function UnitForm({ target, onDone }: { target: UnitFormTarget; onDone: () => void }) {
  const t = useTranslations("Organization.Admin");
  const tOrgErrors = useTranslations("Organization.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");

  const schema = useMemo(
    () =>
      z.object({
        code: z.string().trim().regex(UNIT_CODE_PATTERN, t("codeInvalid")),
        name: z.string().trim().min(1, t("nameRequired")).max(150, t("nameTooLong")),
        executive: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: target.mode === "edit" ? target.code : "",
      name: target.mode === "edit" ? target.name : "",
      executive: target.kind === "department" && target.mode === "edit" ? target.executive : false,
    },
  });

  const mutation = useOrgAdminMutation((values: Values) => {
    if (target.kind === "department") {
      const body = { code: values.code, name: values.name, executive: values.executive };
      return target.mode === "edit" ? updateDepartment(target.id, body) : createDepartment(body);
    }
    const body = { code: values.code, name: values.name, departmentId: target.departmentId };
    return target.mode === "edit" ? updateTeam(target.id, body) : createTeam(body);
  });

  function submit(values: Values) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(t(target.mode === "edit" ? "saved" : "created", { name: values.name.trim() }));
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        if (isCodeExistsError(error)) {
          form.setError("code", { type: "server", message: getOrgError(error, tOrgErrors, tErrors) }, { shouldFocus: true });
        }
      },
    });
  }

  const showAlert =
    mutation.isError &&
    !isCodeExistsError(mutation.error) &&
    !(isApiError(mutation.error) && mutation.error.fieldErrors.length > 0);
  const { errors } = form.formState;
  const titleKey =
    target.kind === "department"
      ? target.mode === "edit"
        ? "editDepartment"
        : "createDepartment"
      : target.mode === "edit"
        ? "editTeam"
        : "createTeam";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(titleKey)}</DialogTitle>
        <DialogDescription>
          {target.kind === "team" ? t("teamDescription", { department: target.departmentName }) : t("departmentDescription")}
        </DialogDescription>
      </DialogHeader>

      {showAlert && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{getOrgError(mutation.error, tOrgErrors, tErrors)}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="org-unit-name">{t("name")}</FieldLabel>
            <Input id="org-unit-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="org-unit-code">{t("code")}</FieldLabel>
            <Input
              id="org-unit-code"
              autoComplete="off"
              className="uppercase"
              aria-invalid={!!errors.code}
              {...form.register("code")}
            />
            <FieldDescription>{t("codeHint")}</FieldDescription>
            <FieldError errors={[errors.code]} />
          </Field>
          {target.kind === "department" && (
            <Controller
              control={form.control}
              name="executive"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox id="org-unit-executive" checked={field.value} onCheckedChange={(checked) => field.onChange(!!checked)} />
                  <FieldContent>
                    <FieldLabel htmlFor="org-unit-executive">{t("executive")}</FieldLabel>
                    <FieldDescription>{t("executiveHint")}</FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          )}
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t(target.mode === "edit" ? "save" : "create")}
        </Button>
      </DialogFooter>
    </>
  );
}
