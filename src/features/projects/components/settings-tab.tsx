"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { setProjectClosed } from "../api";
import { useProjectErrorMessage, useProjectMutation } from "../hooks";
import type { Project } from "../types";
import { ProjectFormDialog } from "./project-form-dialog";

/** S9: thông tin dự án, sửa, đóng hoặc mở lại. */
export function SettingsTab({ project }: { project: Project }) {
  const t = useTranslations("Projects");
  const errorMessage = useProjectErrorMessage();
  const [editing, setEditing] = useState(false);
  const closed = project.status === "CLOSED";
  const toggle = useProjectMutation(() => setProjectClosed(project.id, !closed));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {project.description && <p className="whitespace-pre-wrap">{project.description}</p>}
        <dl className="grid max-w-md grid-cols-2 gap-2">
          <dt className="text-muted-foreground">{t("projectType")}</dt>
          <dd>{t(`projectTypes.${project.type}`)}</dd>
          <dt className="text-muted-foreground">{t("workMode")}</dt>
          <dd>{t(project.sprintEnabled ? "modeSprint" : "modeFlow")}</dd>
          <dt className="text-muted-foreground">{t("startDate")}</dt>
          <dd>{formatDate(project.startDate)}</dd>
          <dt className="text-muted-foreground">{t("endDate")}</dt>
          <dd>{formatDate(project.endDate)}</dd>
        </dl>
        {project.can.manageProject && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={closed} onClick={() => setEditing(true)}>
              {t("editProject")}
            </Button>
            <Button variant="outline" onClick={() => toggle.mutate(undefined, { onError: (error) => toast.error(errorMessage(error)) })}>
              {t(closed ? "reopenProject" : "closeProject")}
            </Button>
          </div>
        )}
      </CardContent>
      {editing && <ProjectFormDialog project={project} onClose={() => setEditing(false)} />}
    </Card>
  );
}
