"use client";

import { useState } from "react";
import Link from "next/link";
import { BriefcaseBusinessIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { useProjects } from "../hooks";
import { PersonChip } from "./badges";
import { ProjectFormDialog } from "./project-form-dialog";

const PAGE = { pageIndex: 0, pageSize: 50 };

/** S1: dự án người dùng được xem. Nút tạo theo quyền project:create. */
export function ProjectsPage() {
  const t = useTranslations("Projects");
  const { hasPermission } = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const projects = useProjects(PAGE);
  const canCreate = hasPermission("project:create");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon /> {t("create")}
            </Button>
          )
        }
      />
      {projects.isPending ? (
        <LoadingState />
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : projects.data.content.length === 0 ? (
        <EmptyState icon={<BriefcaseBusinessIcon />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("pm")}</TableHead>
                <TableHead>{t("workMode")}</TableHead>
                <TableHead className="text-right">{t("people")}</TableHead>
                <TableHead className="text-right">{t("tasks")}</TableHead>
                <TableHead>{t("myRole")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.data.content.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono font-medium">
                    <Link className="text-primary hover:underline" href={`/projects/${project.code}`}>
                      {project.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link className="hover:underline" href={`/projects/${project.code}`}>
                      {project.name}
                    </Link>
                    {project.status === "CLOSED" && (
                      <Badge variant="outline" className="ml-2">
                        {t("closed")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PersonChip person={project.pm} />
                  </TableCell>
                  <TableCell>{t(project.sprintEnabled ? "modeSprint" : "modeFlow")}</TableCell>
                  <TableCell className="text-right tabular-nums">{project.memberCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{project.taskCount}</TableCell>
                  <TableCell>{project.myRole ? t(`role.${project.myRole}`) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {creating && <ProjectFormDialog onClose={() => setCreating(false)} />}
    </>
  );
}
