"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "../api";
import { useProjectErrorMessage, useProjectMutation } from "../hooks";
import { PROJECT_TYPES, type Person, type Project, type ProjectType } from "../types";
import { PersonPicker } from "./person-picker";
import { SimpleSelect } from "./simple-select";

const CODE_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** S2: tạo hoặc sửa dự án. Kanban hay Scrum chỉ là công tắc sprint, đổi được về sau. */
export function ProjectFormDialog({ project, onClose }: { project?: Project; onClose: () => void }) {
  const t = useTranslations("Projects");
  const tCommon = useTranslations("Common");
  const errorMessage = useProjectErrorMessage();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [type, setType] = useState<ProjectType>(project?.type ?? "INTERNAL");
  const [billable, setBillable] = useState(project?.billable ?? false);
  const [pm, setPm] = useState<Person | null>(project?.pm ?? null);
  const [mode, setMode] = useState(project?.sprintEnabled ? "sprint" : "flow");
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [endDate, setEndDate] = useState(project?.endDate ?? "");

  const mutation = useProjectMutation(() => {
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      billable,
      pmEmployeeId: pm!.id,
      ownerDepartmentId: project?.ownerDepartmentId ?? null,
      sprintEnabled: mode === "sprint",
      startDate: startDate || null,
      endDate: endDate || null,
    };
    return project ? updateProject(project.id, { ...body, version: project.version }) : createProject({ ...body, code });
  });

  const valid = name.trim() && pm && (project || CODE_PATTERN.test(code));

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(t("saved"));
        onClose();
        if (!project) router.push(`/projects/${result.code}`);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{project ? t("editProject") : t("create")}</DialogTitle>
            <DialogDescription>{t("formHint")}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            {!project && (
              <Field>
                <FieldLabel htmlFor="project-code">{t("code")}</FieldLabel>
                <Input id="project-code" className="font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <FieldDescription>{t("codeHint")}</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="project-name">{t("name")}</FieldLabel>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="project-type">{t("projectType")}</FieldLabel>
                <SimpleSelect
                  id="project-type"
                  className="w-full"
                  value={type}
                  onChange={(value) => setType(value as ProjectType)}
                  options={PROJECT_TYPES.map((value) => ({ value, label: t(`projectTypes.${value}`) }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-pm">{t("pm")}</FieldLabel>
                <PersonPicker id="project-pm" value={pm} onChange={setPm} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="project-mode">{t("workMode")}</FieldLabel>
              <SimpleSelect
                id="project-mode"
                className="w-full"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "flow", label: t("modeFlow") },
                  { value: "sprint", label: t("modeSprint") },
                ]}
              />
              <FieldDescription>{t(mode === "sprint" ? "modeSprintHint" : "modeFlowHint")}</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="project-start">{t("startDate")}</FieldLabel>
                <Input id="project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-end">{t("endDate")}</FieldLabel>
                <Input id="project-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="project-description">{t("descriptionLabel")}</FieldLabel>
              <Textarea id="project-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={billable} onCheckedChange={(checked) => setBillable(checked === true)} />
              {t("billable")}
            </label>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || mutation.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
