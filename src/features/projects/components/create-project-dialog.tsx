"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { applyServerFieldErrors } from "@/lib/forms";
import { todayIsoDate } from "@/lib/format";
import { isApiError } from "@/lib/api/errors";
import { createProject } from "../api";
import { isProjectErrorCode } from "../error-messages";
import { useOrgDepartments, useOrgOffices, useProjectCreateScope, useProjectErrorMessage, useProjectMutation } from "../hooks";
import { creatableDepartments, DESCRIPTION_MAX_LENGTH, isValidPercent, NAME_MAX_LENGTH, PROJECT_CODE_PATTERN } from "../rules";
import { PROJECT_TYPES, type ProjectPerson, type ProjectType } from "../types";
import { EmployeePicker } from "./employee-picker";

const FORM_ID = "project-create-form";

/** Tạo dự án kèm chỉ định PM: trưởng phòng cho phòng mình, giám đốc và project:manage cho mọi phòng. */
export function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open && <CreateForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Projects.Form");
  const tType = useTranslations("Projects.types");
  const tCommon = useTranslations("Common");
  const errorMessage = useProjectErrorMessage();
  const router = useRouter();
  const scope = useProjectCreateScope();
  const departments = useOrgDepartments();
  const offices = useOrgOffices();
  const departmentChoices = creatableDepartments(scope.data, departments.data ?? []);

  const schema = useMemo(
    () =>
      z
        .object({
          code: z.string().trim().regex(PROJECT_CODE_PATTERN, t("codeInvalid")),
          name: z.string().trim().min(1, t("nameRequired")).max(NAME_MAX_LENGTH, t("nameTooLong")),
          description: z.string().max(DESCRIPTION_MAX_LENGTH, t("descriptionTooLong")),
          type: z.enum(PROJECT_TYPES, { error: t("typeRequired") }),
          billable: z.boolean(),
          sprintEnabled: z.boolean(),
          ownerDepartmentId: z.string().min(1, t("departmentRequired")),
          officeId: z.string().min(1, t("officeRequired")),
          pm: z.custom<ProjectPerson>((value) => !!value, t("pmRequired")),
          pmAllocationPercent: z.string().refine(isValidPercent, t("percentInvalid")),
          startDate: z.string().min(1, t("startDateRequired")),
          endDate: z.string(),
        })
        .refine((values) => !values.endDate || values.endDate >= values.startDate, {
          path: ["endDate"],
          message: t("endBeforeStart"),
        }),
    [t],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "" as ProjectType,
      billable: false,
      sprintEnabled: false,
      // Trưởng phòng chỉ có một phòng thì chọn sẵn
      ownerDepartmentId: departmentChoices.length === 1 ? departmentChoices[0].id : "",
      officeId: "",
      pm: undefined,
      pmAllocationPercent: "",
      startDate: todayIsoDate(),
      endDate: "",
    },
  });

  const mutation = useProjectMutation((values: Values) =>
    createProject({
      code: values.code,
      name: values.name,
      description: values.description.trim() || null,
      type: values.type,
      billable: values.billable,
      ownerDepartmentId: values.ownerDepartmentId,
      officeId: values.officeId,
      pmEmployeeId: values.pm.id,
      pmAllocationPercent: Number(values.pmAllocationPercent),
      startDate: values.startDate,
      endDate: values.endDate || null,
      sprintEnabled: values.sprintEnabled,
    }),
  );

  function submit(values: Values) {
    mutation.mutate(values, {
      onSuccess: (project) => {
        toast.success(t("created", { name: project.name }));
        onDone();
        router.push(`/projects/${project.code}`);
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        if (isProjectErrorCode(error, "PROJECT_CODE_EXISTS")) {
          form.setError("code", { type: "server", message: errorMessage(error) }, { shouldFocus: true });
        }
      },
    });
  }

  const onField =
    isProjectErrorCode(mutation.error, "PROJECT_CODE_EXISTS") ||
    (isApiError(mutation.error) && mutation.error.fieldErrors.length > 0);
  const { errors } = form.formState;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("createTitle")}</DialogTitle>
        <DialogDescription>{t("createDescription")}</DialogDescription>
      </DialogHeader>

      {mutation.isError && !onField && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="project-code">{t("code")}</FieldLabel>
              <Input id="project-code" autoComplete="off" className="font-mono uppercase" aria-invalid={!!errors.code} {...form.register("code")} />
              <FieldError errors={[errors.code]} />
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="project-name">{t("name")}</FieldLabel>
              <Input id="project-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">{t("codeHint")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field data-invalid={!!errors.type}>
                  <FieldLabel htmlFor="project-type">{t("type")}</FieldLabel>
                  <ChoiceSelect
                    id="project-type"
                    value={field.value}
                    onChange={field.onChange}
                    choices={PROJECT_TYPES.map((type) => ({ value: type, label: tType(type) }))}
                    placeholder={t("typePlaceholder")}
                    invalid={!!errors.type}
                  />
                  <FieldError errors={[errors.type]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="sprintEnabled"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox id="project-sprint" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  <FieldLabel htmlFor="project-sprint">{t("sprintEnabled")}</FieldLabel>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="billable"
              render={({ field }) => (
                <Field orientation="horizontal" className="sm:pt-7">
                  <Checkbox id="project-billable" checked={field.value} onCheckedChange={(checked) => field.onChange(!!checked)} />
                  <FieldLabel htmlFor="project-billable">{t("billable")}</FieldLabel>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="ownerDepartmentId"
              render={({ field }) => (
                <Field data-invalid={!!errors.ownerDepartmentId}>
                  <FieldLabel htmlFor="project-department">{t("department")}</FieldLabel>
                  <ChoiceSelect
                    id="project-department"
                    value={field.value}
                    onChange={field.onChange}
                    choices={departmentChoices.map((unit) => ({ value: unit.id, label: unit.name }))}
                    placeholder={t("departmentPlaceholder")}
                    invalid={!!errors.ownerDepartmentId}
                  />
                  <FieldError errors={[errors.ownerDepartmentId]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="officeId"
              render={({ field }) => (
                <Field data-invalid={!!errors.officeId}>
                  <FieldLabel htmlFor="project-office">{t("office")}</FieldLabel>
                  <ChoiceSelect
                    id="project-office"
                    value={field.value}
                    onChange={field.onChange}
                    choices={(offices.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
                    placeholder={t("officePlaceholder")}
                    invalid={!!errors.officeId}
                  />
                  <FieldError errors={[errors.officeId]} />
                </Field>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Controller
              control={form.control}
              name="pm"
              render={({ field }) => (
                <Field data-invalid={!!errors.pm}>
                  <FieldLabel htmlFor="project-pm">{t("pm")}</FieldLabel>
                  <EmployeePicker id="project-pm" value={field.value ?? null} onChange={field.onChange} invalid={!!errors.pm} />
                  <FieldError errors={[errors.pm]} />
                </Field>
              )}
            />
            <Field data-invalid={!!errors.pmAllocationPercent}>
              <FieldLabel htmlFor="project-pm-percent">{t("pmPercent")}</FieldLabel>
              <Input
                id="project-pm-percent"
                type="number"
                inputMode="numeric"
                min={5}
                max={100}
                step={5}
                aria-invalid={!!errors.pmAllocationPercent}
                {...form.register("pmAllocationPercent")}
              />
              <FieldError errors={[errors.pmAllocationPercent]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.startDate}>
              <FieldLabel htmlFor="project-start">{t("startDate")}</FieldLabel>
              <Input id="project-start" type="date" aria-invalid={!!errors.startDate} {...form.register("startDate")} />
              <FieldError errors={[errors.startDate]} />
            </Field>
            <Field data-invalid={!!errors.endDate}>
              <FieldLabel htmlFor="project-end">{t("endDate")}</FieldLabel>
              <Input id="project-end" type="date" aria-invalid={!!errors.endDate} {...form.register("endDate")} />
              <FieldDescription>{t("endDateHint")}</FieldDescription>
              <FieldError errors={[errors.endDate]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="project-description">{t("descriptionLabel")}</FieldLabel>
            <Textarea id="project-description" rows={3} aria-invalid={!!errors.description} {...form.register("description")} />
            <FieldDescription>{t("descriptionHint")}</FieldDescription>
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("create")}
        </Button>
      </DialogFooter>
    </>
  );
}
