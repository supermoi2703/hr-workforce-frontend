"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ChevronDownIcon, FolderXIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { isApiError } from "@/lib/api/errors";
import { formatDate, todayIsoDate } from "@/lib/format";
import { closeProject } from "../api";
import { useProject, useProjectErrorMessage, useProjectMembers, useProjectMutation } from "../hooks";
import { allocatedEmployeeIds, currentManager } from "../rules";
import type { Project } from "../types";
import { ProjectRoleBadge, ProjectStatusBadge } from "./project-badges";
import { ChangeManagerDialog, EditProjectDialog, ProjectSettingsDialog } from "./project-edit-dialogs";
import { ProjectMembers } from "./project-members";
import { ProjectStaffing } from "./project-staffing";
import { ProjectWorkspace } from "./project-workspace";

const LIST_PATH = "/projects";

/** Chi tiết một dự án. Nút thao tác hiện theo `can` của backend, không tự suy quyền ở frontend. */
export function ProjectDetailPage({ code }: { code: string }) {
  const t = useTranslations("Projects.Detail");
  const query = useProject(code);

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState icon={<FolderXIcon />} title={t("notFound")} description={t("notFoundDescription")} className="border border-dashed" />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {backLink}
      <ProjectDetail project={query.data} />
    </>
  );
}

type DialogName = "edit" | "settings" | "pm" | "close";

function ProjectDetail({ project }: { project: Project }) {
  const t = useTranslations("Projects.Detail");
  const tType = useTranslations("Projects.types");
  const tColumns = useTranslations("Projects.Columns");
  const errorMessage = useProjectErrorMessage();
  const today = todayIsoDate();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const members = useProjectMembers(project.id, project.closedOn ?? undefined);
  const close = useProjectMutation(() => closeProject(project.id));
  const { can } = project;
  const manager = currentManager(members.data ?? []);
  const hasMenu = can.manageSettings || can.close;

  const openDialog = (name: DialogName) => (open: boolean) => setDialog(open ? name : null);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{project.code}</span>
            <ProjectStatusBadge project={project} today={today} />
            {project.myRole && <ProjectRoleBadge role={project.myRole} />}
          </p>
        </div>
        {(can.editDetails || hasMenu) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {can.editDetails && (
              <Button onClick={() => setDialog("edit")}>
                <PencilIcon /> {t("edit")}
              </Button>
            )}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  {t("more")} <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {can.manageSettings && <DropdownMenuItem onClick={() => setDialog("settings")}>{t("settings")}</DropdownMenuItem>}
                  {can.manageSettings && <DropdownMenuItem onClick={() => setDialog("pm")}>{t("changePm")}</DropdownMenuItem>}
                  {can.close && (
                    <DropdownMenuItem variant="destructive" onClick={() => setDialog("close")}>
                      {t("close")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <ProjectWorkspace
        project={project}
        info={
            <DetailList>
              <DetailRow label={t("type")}>
                <span className="flex flex-wrap items-center gap-2">
                  {tType(project.type)}
                  {project.billable && <Badge variant="secondary">{tColumns("billable")}</Badge>}
                </span>
              </DetailRow>
              <DetailRow label={t("department")}>{project.ownerDepartment?.name ?? "—"}</DetailRow>
              <DetailRow label={t("office")}>{project.office?.name ?? "—"}</DetailRow>
              <DetailRow label={t("pm")}>
                {project.pm ? (
                  <span className="flex items-center gap-2">
                    <UserAvatar name={project.pm.fullName} seed={project.pm.id} size="sm" />
                    {project.pm.fullName}
                  </span>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label={t("period")}>
                {formatDate(project.startDate)} – {project.endDate ? formatDate(project.endDate) : tColumns("noEndDate")}
              </DetailRow>
              {project.closedOn && <DetailRow label={t("closedOn")}>{formatDate(project.closedOn)}</DetailRow>}
              <DetailRow label={t("description")}>
                {can.viewTaskContent ? (
                  project.description ? (
                    <span className="whitespace-pre-wrap">{project.description}</span>
                  ) : (
                    <span className="text-muted-foreground">{t("noDescription")}</span>
                  )
                ) : (
                  <span className="text-muted-foreground">{t("descriptionHidden")}</span>
                )}
              </DetailRow>
            </DetailList>
        }
        members={
          <div className="grid gap-4">
            {(can.manageMembers || can.viewAllocation) && <ProjectStaffing project={project} />}
            <ProjectMembers
              project={project}
              members={members.data}
              isPending={members.isPending}
              error={members.error}
              onRetry={() => members.refetch()}
            />
          </div>
        }
      />

      <EditProjectDialog project={project} open={dialog === "edit"} onOpenChange={openDialog("edit")} />
      <ProjectSettingsDialog project={project} open={dialog === "settings"} onOpenChange={openDialog("settings")} />
      <ChangeManagerDialog
        project={project}
        open={dialog === "pm"}
        onOpenChange={openDialog("pm")}
        current={project.pm}
        currentPercent={manager?.allocationPercent ?? null}
        allocatedIds={allocatedEmployeeIds(members.data ?? [])}
      />
      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={openDialog("close")}
        title={t("closeTitle", { name: project.name })}
        description={t("closeDescription")}
        confirmLabel={t("close")}
        destructive
        onConfirm={() =>
          close.mutateAsync(undefined).then(
            () => {
              toast.success(t("closed", { name: project.name }));
            },
            (failure) => {
              toast.error(errorMessage(failure));
              throw failure;
            },
          )
        }
      />
    </>
  );
}
