"use client";

import { useState } from "react";
import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addMember, attachTeam, detachTeam, removeMember, syncTeam, updateMember } from "../api";
import { useMembers, useProjectErrorMessage, useProjectMutation, useWorkTeams } from "../hooks";
import { PROJECT_ROLES, type Member, type Person, type Project, type ProjectRole } from "../types";
import { PersonChip } from "./badges";
import { PersonPicker } from "./person-picker";
import { SimpleSelect } from "./simple-select";

const ALLOCATIONS = [100, 75, 50, 25, 0];

/** S8: đội đã gắn và thành viên. Gắn đội chỉ là cách thêm nhiều người cùng lúc. */
export function MembersTab({ project }: { project: Project }) {
  const t = useTranslations("Projects");
  const errorMessage = useProjectErrorMessage();
  const members = useMembers(project.id);
  const teams = useWorkTeams();
  const [person, setPerson] = useState<Person | null>(null);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const manage = project.can.manageMembers;
  const add = useProjectMutation((p: Person) => addMember(project.id, { employeeId: p.id, role: "MEMBER", allocationPercent: 100 }));
  const update = useProjectMutation(({ m, role, percent }: { m: Member; role: ProjectRole; percent: number }) =>
    updateMember(project.id, m.person.id, { role, allocationPercent: percent }),
  );
  const remove = useProjectMutation((m: Member) => removeMember(project.id, m.person.id));
  const attach = useProjectMutation((id: string) => attachTeam(project.id, id));
  const sync = useProjectMutation((id: string) => syncTeam(project.id, id));
  const detach = useProjectMutation((id: string) => detachTeam(project.id, id));

  if (members.isPending) return <LoadingState />;
  if (members.isError) return <ErrorState error={members.error} onRetry={() => members.refetch()} />;
  const attached = new Set(members.data.teams.map((team) => team.workTeamId));
  const available = (teams.data ?? []).filter((team) => team.active && !attached.has(team.id));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("attachedTeams")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {members.data.teams.length === 0 && <p className="text-muted-foreground text-sm">{t("noTeams")}</p>}
          {members.data.teams.map((team) => (
            <div key={team.workTeamId} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{team.name}</span>
              <Badge variant="secondary">{t("peopleCount", { count: team.memberCount })}</Badge>
              {manage && (
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => sync.mutate(team.workTeamId, fail)}>
                    <RefreshCwIcon /> {t("syncTeam")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => detach.mutate(team.workTeamId, fail)}>
                    <Trash2Icon /> {t("detachTeam")}
                  </Button>
                </span>
              )}
            </div>
          ))}
          {manage && available.length > 0 && (
            <SimpleSelect
              className="w-64"
              value={null}
              placeholder={t("attachTeam")}
              onChange={(id) => attach.mutate(id, fail)}
              options={available.map((team) => ({ value: team.id, label: team.name }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("members")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {manage && (
            <div className="flex max-w-md items-center gap-2">
              <div className="flex-1">
                <PersonPicker value={person} onChange={setPerson} placeholder={t("addPerson")} />
              </div>
              <Button disabled={!person} onClick={() => person && add.mutate(person, { ...fail, onSuccess: () => setPerson(null) })}>
                {t("add")}
              </Button>
            </div>
          )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("person")}</TableHead>
                  <TableHead>{t("roleLabel")}</TableHead>
                  <TableHead>{t("source")}</TableHead>
                  <TableHead>{t("allocation")}</TableHead>
                  <TableHead className="text-right">{t("tasks")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.members.map((m) => (
                  <TableRow key={m.person.id}>
                    <TableCell>
                      <PersonChip person={m.person} />
                    </TableCell>
                    <TableCell>
                      {manage && m.role !== "PM" ? (
                        <SimpleSelect
                          size="sm"
                          className="w-32"
                          value={m.role}
                          onChange={(role) => update.mutate({ m, role: role as ProjectRole, percent: m.allocationPercent }, fail)}
                          options={PROJECT_ROLES.filter((role) => role !== "PM").map((value) => ({ value, label: t(`role.${value}`) }))}
                        />
                      ) : (
                        t(`role.${m.role}`)
                      )}
                    </TableCell>
                    <TableCell>{m.source === "TEAM" ? m.sourceTeamName : t("sourceDirect")}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {manage ? (
                          <SimpleSelect
                            size="sm"
                            className="w-24"
                            value={String(m.allocationPercent)}
                            onChange={(value) => update.mutate({ m, role: m.role, percent: Number(value) }, fail)}
                            options={[...new Set([...ALLOCATIONS, m.allocationPercent])].map((value) => ({ value: String(value), label: `${value}%` }))}
                          />
                        ) : (
                          `${m.allocationPercent}%`
                        )}
                        {m.totalAllocationPercent > 100 && <Badge variant="warning">{t("overAllocated", { total: m.totalAllocationPercent })}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.openTasks}</TableCell>
                    <TableCell className="text-right">
                      {manage && m.role !== "PM" && (
                        <Button size="icon-sm" variant="ghost" aria-label={t("removeMember")} onClick={() => remove.mutate(m, fail)}>
                          <Trash2Icon />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
