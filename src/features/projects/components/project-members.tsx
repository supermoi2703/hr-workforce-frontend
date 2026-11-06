"use client";

import { useState } from "react";
import Link from "next/link";
import { UserMinusIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { removeProjectObserver } from "../api";
import { useProjectErrorMessage, useProjectMutation } from "../hooks";
import { hasHiddenPercent } from "../rules";
import type { Project, ProjectMember } from "../types";
import { ProjectRoleBadge } from "./project-badges";
import { AddObserverDialog } from "./project-edit-dialogs";

type ProjectMembersProps = {
  project: Project;
  members: ProjectMember[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/**
 * Người tham gia. Dự án đã đóng thì mọi người đã rời, nên hiện người có hiệu lực ngày đóng. Cột % trống khi người xem
 * không được xem (backend trả null); thành viên vào dự án qua đề xuất phân bổ (3.4), ở đây chỉ thêm người quan sát.
 */
export function ProjectMembers({ project, members, isPending, error, onRetry }: ProjectMembersProps) {
  const t = useTranslations("Projects.Members");
  const { hasPermission } = useCurrentUser();
  const errorMessage = useProjectErrorMessage();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const remove = useProjectMutation((employeeId: string) => removeProjectObserver(project.id, employeeId));
  const canManage = project.can.manageObservers;
  const profileLinks = hasPermission("employee:read");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("title")}</h2>
          {project.closedOn && <p className="text-sm text-muted-foreground">{t("onClosedDate")}</p>}
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <UserPlusIcon /> {t("addObserver")}
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !members?.length ? (
        <EmptyState className="border border-dashed py-10" title={t("empty")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("person")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead className="text-right">{t("percent")}</TableHead>
                  <TableHead>{t("period")}</TableHead>
                  {canManage && (
                    <TableHead className="w-12">
                      <span className="sr-only">{t("actions")}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={`${member.employee.id}-${member.role}-${member.fromDate}`}>
                    <TableCell>
                      <span className="flex min-w-44 items-center gap-2.5">
                        <UserAvatar name={member.employee.fullName} seed={member.employee.id} size="sm" />
                        <span className="min-w-0">
                          {profileLinks ? (
                            <Link href={`/employees/${member.employee.id}`} className="block truncate font-medium hover:underline">
                              {member.employee.fullName}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium">{member.employee.fullName}</span>
                          )}
                          <span className="block font-mono text-xs text-muted-foreground">{member.employee.employeeCode}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <ProjectRoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {member.allocationPercent === null ? "—" : `${member.allocationPercent}%`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(member.fromDate)} – {member.toDate ? formatDate(member.toDate) : t("noEnd")}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {member.role === "OBSERVER" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("removeObserverOf", { name: member.employee.fullName })}
                            onClick={() => setRemoving(member)}
                          >
                            <UserMinusIcon />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {hasHiddenPercent(members) && <p className="text-sm text-muted-foreground">{t("percentHidden")}</p>}
        </>
      )}

      <AddObserverDialog
        project={project}
        open={adding}
        onOpenChange={setAdding}
        memberIds={(members ?? []).map((member) => member.employee.id)}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("removeObserverTitle")}
        description={removing ? t("removeObserverDescription", { name: removing.employee.fullName }) : undefined}
        confirmLabel={t("removeObserver")}
        destructive
        onConfirm={() =>
          removing
            ? remove.mutateAsync(removing.employee.id).catch((failure) => {
                toast.error(errorMessage(failure));
                throw failure;
              })
            : undefined
        }
      />
    </section>
  );
}
