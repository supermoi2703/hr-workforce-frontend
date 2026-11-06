"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
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
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { addProjectObserver, changeProjectManager, updateProject, updateProjectSettings } from "../api";
import { useOrgDepartments, useOrgOffices, useProjectErrorMessage, useProjectMutation } from "../hooks";
import { DESCRIPTION_MAX_LENGTH, isValidPercent, NAME_MAX_LENGTH } from "../rules";
import { PROJECT_TYPES, type Project, type ProjectPerson } from "../types";
import { EmployeePicker } from "./employee-picker";

const FORM_ID = "project-edit-form";

type DialogProps = { project: Project; open: boolean; onOpenChange: (open: boolean) => void };

/** Lỗi không gắn được vào ô nào. */
function FormAlert({ error, message }: { error: unknown; message: (error: unknown) => string }) {
  if (!error || (isApiError(error) && error.fieldErrors.length > 0)) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message(error)}</AlertDescription>
    </Alert>
  );
}

function SubmitFooter({ label, pending, disabled }: { label: string; pending: boolean; disabled?: boolean }) {
  const tCommon = useTranslations("Common");
  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
      <Button type="submit" form={FORM_ID} disabled={pending || disabled}>
        {pending && <Spinner />}
        {label}
      </Button>
    </DialogFooter>
  );
}

// ===== Tên, mô tả, thời gian: PM, trưởng phòng chủ quản, giám đốc

/** `can.editDetails` luôn đi cùng `can.viewTaskContent` nên mô tả đã có đủ, sửa không làm mất mô tả. */
export function EditProjectDialog({ project, open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <EditForm project={project} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const t = useTranslations("Projects.Form");
  const errorMessage = useProjectErrorMessage();
  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(1, t("nameRequired")).max(NAME_MAX_LENGTH, t("nameTooLong")),
          description: z.string().max(DESCRIPTION_MAX_LENGTH, t("descriptionTooLong")),
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
      name: project.name,
      description: project.description ?? "",
      startDate: project.startDate,
      endDate: project.endDate ?? "",
    },
  });
  const mutation = useProjectMutation((values: Values) =>
    updateProject(project.id, {
      name: values.name,
      description: values.description.trim() || null,
      startDate: values.startDate,
      endDate: values.endDate || null,
      version: project.version,
    }),
  );

  function submit(values: Values) {
    mutation.mutate(values, {
      onSuccess: (result) => {
        toast.success(t("saved", { name: result.name }));
        onDone();
      },
      onError: (error) => {
        applyServerFieldErrors(error, form.setError);
      },
    });
  }

  const { errors } = form.formState;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editTitle")}</DialogTitle>
        <DialogDescription>{t("editDescription")}</DialogDescription>
      </DialogHeader>
      <FormAlert error={mutation.error} message={errorMessage} />
      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="project-name">{t("name")}</FieldLabel>
            <Input id="project-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.startDate}>
              <FieldLabel htmlFor="project-start">{t("startDate")}</FieldLabel>
              <Input id="project-start" type="date" aria-invalid={!!errors.startDate} {...form.register("startDate")} />
              <FieldError errors={[errors.startDate]} />
            </Field>
            <Field data-invalid={!!errors.endDate}>
              <FieldLabel htmlFor="project-end">{t("endDate")}</FieldLabel>
              <Input id="project-end" type="date" aria-invalid={!!errors.endDate} {...form.register("endDate")} />
              <FieldError errors={[errors.endDate]} />
            </Field>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">{t("datesHint")}</p>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="project-description">{t("descriptionLabel")}</FieldLabel>
            <Textarea id="project-description" rows={4} aria-invalid={!!errors.description} {...form.register("description")} />
            <FieldDescription>{t("descriptionHint")}</FieldDescription>
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </form>
      <SubmitFooter label={t("save")} pending={mutation.isPending} />
    </>
  );
}

// ===== Loại, tính phí, phòng và văn phòng chủ quản: trưởng phòng chủ quản, giám đốc

export function ProjectSettingsDialog({ project, open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <SettingsForm project={project} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const t = useTranslations("Projects.Form");
  const tType = useTranslations("Projects.types");
  const errorMessage = useProjectErrorMessage();
  const departments = useOrgDepartments();
  const offices = useOrgOffices();
  const [type, setType] = useState(project.type);
  const [billable, setBillable] = useState(project.billable);
  const [departmentId, setDepartmentId] = useState(project.ownerDepartment?.id ?? "");
  const [officeId, setOfficeId] = useState(project.office?.id ?? "");

  const mutation = useProjectMutation(() =>
    updateProjectSettings(project.id, { type, billable, ownerDepartmentId: departmentId, officeId, version: project.version }),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(t("saved", { name: result.name }));
        onDone();
      },
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("settingsTitle")}</DialogTitle>
        <DialogDescription>{t("settingsDescription")}</DialogDescription>
      </DialogHeader>
      <FormAlert error={mutation.error} message={errorMessage} />
      <form id={FORM_ID} onSubmit={submit}>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="project-type">{t("type")}</FieldLabel>
            <ChoiceSelect
              id="project-type"
              value={type}
              onChange={(value) => setType(value as typeof type)}
              choices={PROJECT_TYPES.map((value) => ({ value, label: tType(value) }))}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="project-billable" checked={billable} onCheckedChange={(checked) => setBillable(!!checked)} />
            <FieldLabel htmlFor="project-billable">{t("billable")}</FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor="project-department">{t("department")}</FieldLabel>
            <ChoiceSelect
              id="project-department"
              value={departmentId}
              onChange={setDepartmentId}
              choices={(departments.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
            />
            <FieldDescription>{t("departmentHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="project-office">{t("office")}</FieldLabel>
            <ChoiceSelect
              id="project-office"
              value={officeId}
              onChange={setOfficeId}
              choices={(offices.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
            />
          </Field>
        </FieldGroup>
      </form>
      <SubmitFooter label={t("save")} pending={mutation.isPending} disabled={!departmentId || !officeId} />
    </>
  );
}

// ===== Đổi PM: trưởng phòng chủ quản, giám đốc

type ChangePmProps = DialogProps & {
  current: ProjectPerson | null;
  currentPercent: number | null;
  /** Người đang có phân bổ, phải kết thúc phân bổ trước khi làm PM. */
  allocatedIds: string[];
};

export function ChangeManagerDialog({ project, open, onOpenChange, current, currentPercent, allocatedIds }: ChangePmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ChangeManagerForm
            project={project}
            current={current}
            currentPercent={currentPercent}
            allocatedIds={allocatedIds}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeManagerForm({
  project,
  current,
  currentPercent,
  allocatedIds,
  onDone,
}: Omit<ChangePmProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const t = useTranslations("Projects.Form");
  const errorMessage = useProjectErrorMessage();
  const [person, setPerson] = useState<ProjectPerson | null>(current);
  const [percent, setPercent] = useState(currentPercent === null ? "" : String(currentPercent));
  const [touched, setTouched] = useState(false);
  const percentValid = isValidPercent(percent);
  const disabled = useMemo(() => new Map(allocatedIds.map((id) => [id, t("hasAllocation")])), [allocatedIds, t]);

  const mutation = useProjectMutation(({ employeeId, value }: { employeeId: string; value: number }) =>
    changeProjectManager(project.id, employeeId, value),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!person || !percentValid) return;
    mutation.mutate(
      { employeeId: person.id, value: Number(percent) },
      {
        onSuccess: () => {
          toast.success(t("pmSaved"));
          onDone();
        },
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("changePmTitle")}</DialogTitle>
        <DialogDescription>{t("changePmDescription")}</DialogDescription>
      </DialogHeader>
      <FormAlert error={mutation.error} message={errorMessage} />
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="project-pm">{t("pm")}</FieldLabel>
            <EmployeePicker id="project-pm" value={person} onChange={setPerson} disabled={disabled} />
          </Field>
          <Field data-invalid={touched && !percentValid}>
            <FieldLabel htmlFor="project-pm-percent">{t("pmPercent")}</FieldLabel>
            <Input
              id="project-pm-percent"
              type="number"
              inputMode="numeric"
              min={5}
              max={100}
              step={5}
              className="w-32"
              value={percent}
              aria-invalid={touched && !percentValid}
              onChange={(event) => setPercent(event.target.value)}
            />
            {touched && !percentValid && <FieldError>{t("percentInvalid")}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
      <SubmitFooter label={t("save")} pending={mutation.isPending} disabled={!person} />
    </>
  );
}

// ===== Thêm người quan sát: PM, trưởng phòng chủ quản, giám đốc

type AddObserverProps = DialogProps & { memberIds: string[] };

export function AddObserverDialog({ project, open, onOpenChange, memberIds }: AddObserverProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <AddObserverForm project={project} memberIds={memberIds} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AddObserverForm({ project, memberIds, onDone }: { project: Project; memberIds: string[]; onDone: () => void }) {
  const t = useTranslations("Projects.Members");
  const errorMessage = useProjectErrorMessage();
  const [person, setPerson] = useState<ProjectPerson | null>(null);
  const disabled = useMemo(() => new Map(memberIds.map((id) => [id, t("alreadyIn")])), [memberIds, t]);
  const mutation = useProjectMutation((employeeId: string) => addProjectObserver(project.id, employeeId));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!person) return;
    mutation.mutate(person.id, {
      onSuccess: () => {
        toast.success(t("observerAdded", { name: person.fullName }));
        onDone();
      },
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("addObserverTitle")}</DialogTitle>
        <DialogDescription>{t("addObserverDescription")}</DialogDescription>
      </DialogHeader>
      <FormAlert error={mutation.error} message={errorMessage} />
      <form id={FORM_ID} onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor="project-observer">{t("employee")}</FieldLabel>
          <EmployeePicker id="project-observer" value={person} onChange={setPerson} disabled={disabled} />
        </Field>
      </form>
      <SubmitFooter label={t("add")} pending={mutation.isPending} disabled={!person} />
    </>
  );
}
