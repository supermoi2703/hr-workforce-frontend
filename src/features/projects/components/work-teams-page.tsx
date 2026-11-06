"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { addTeamMember, createWorkTeam, removeTeamMember, updateWorkTeam } from "../api";
import { useProjectErrorMessage, useProjectMutation, useWorkTeam, useWorkTeams } from "../hooks";
import type { Person, WorkTeam } from "../types";
import { PersonChip } from "./badges";
import { PersonPicker } from "./person-picker";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,19}$/;

/** S12: đội dự án. Khác team tổ chức: một người thuộc nhiều đội, không đổi sếp trực tiếp. */
export function WorkTeamsPage() {
  const t = useTranslations("Projects");
  const { hasPermission } = useCurrentUser();
  const teams = useWorkTeams();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t("teamsTitle")}
        description={t("teamsDescription")}
        actions={
          hasPermission("work-team:create") && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon /> {t("newTeam")}
            </Button>
          )
        }
      />
      {teams.isPending ? (
        <LoadingState />
      ) : teams.isError ? (
        <ErrorState error={teams.error} onRetry={() => teams.refetch()} />
      ) : teams.data.length === 0 ? (
        <EmptyState icon={<UsersRoundIcon />} title={t("teamsEmpty")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("teamLead")}</TableHead>
                <TableHead className="text-right">{t("people")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.data.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-mono">{team.code}</TableCell>
                  <TableCell>
                    <button type="button" className="hover:underline" onClick={() => setSelected(team.id)}>
                      {team.name}
                    </button>
                    {!team.active && (
                      <Badge variant="outline" className="ml-2">
                        {t("closed")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PersonChip person={team.lead} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{team.memberCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {creating && <TeamDialog onClose={() => setCreating(false)} />}
      <TeamSheet id={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function TeamDialog({ team, onClose }: { team?: WorkTeam; onClose: () => void }) {
  const t = useTranslations("Projects");
  const tCommon = useTranslations("Common");
  const errorMessage = useProjectErrorMessage();
  const [code, setCode] = useState(team?.code ?? "");
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [lead, setLead] = useState<Person | null>(team?.lead ?? null);
  const mutation = useProjectMutation(() => {
    const body = { code, name: name.trim(), description: description.trim() || null, leadEmployeeId: lead?.id ?? null, active: team?.active ?? true };
    return team ? updateWorkTeam(team.id, body) : createWorkTeam(body);
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? t("editTeam") : t("newTeam")}</DialogTitle>
          <DialogDescription>{t("teamHint")}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="team-code">{t("code")}</FieldLabel>
            <Input id="team-code" className="font-mono uppercase" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
            <FieldDescription>{t("teamCodeHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="team-name">{t("name")}</FieldLabel>
            <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="team-lead">{t("teamLead")}</FieldLabel>
            <PersonPicker id="team-lead" value={lead} onChange={setLead} />
          </Field>
          <Field>
            <FieldLabel htmlFor="team-description">{t("descriptionLabel")}</FieldLabel>
            <Textarea id="team-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={!CODE_PATTERN.test(code) || !name.trim() || mutation.isPending}
            onClick={() => mutation.mutate(undefined, { onSuccess: onClose, onError: (error) => toast.error(errorMessage(error)) })}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations("Projects");
  const errorMessage = useProjectErrorMessage();
  const detail = useWorkTeam(id);
  const [person, setPerson] = useState<Person | null>(null);
  const [editing, setEditing] = useState(false);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const add = useProjectMutation((p: Person) => addTeamMember(id!, p.id));
  const remove = useProjectMutation((employeeId: string) => removeTeamMember(id!, employeeId));

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {detail.isPending ? (
          <LoadingState />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        ) : (
          <div className="grid gap-4 p-4">
            <SheetHeader className="p-0">
              <SheetDescription className="font-mono">{detail.data.team.code}</SheetDescription>
              <SheetTitle>{detail.data.team.name}</SheetTitle>
            </SheetHeader>
            {detail.data.team.description && <p className="text-sm">{detail.data.team.description}</p>}
            {detail.data.team.canManage && (
              <div className="grid gap-2">
                <div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    {t("editTeam")}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <PersonPicker value={person} onChange={setPerson} placeholder={t("addPerson")} />
                  </div>
                  <Button disabled={!person} onClick={() => person && add.mutate(person, { ...fail, onSuccess: () => setPerson(null) })}>
                    {t("add")}
                  </Button>
                </div>
              </div>
            )}
            <ul className="divide-y">
              {detail.data.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <PersonChip person={member} />
                  {detail.data.team.canManage && (
                    <Button size="icon-sm" variant="ghost" aria-label={t("removeMember")} onClick={() => remove.mutate(member.id, fail)}>
                      <Trash2Icon />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {editing && <TeamDialog team={detail.data.team} onClose={() => setEditing(false)} />}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
