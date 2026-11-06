"use client";

import { useMemo, useState } from "react";
import { Trash2Icon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PersonChip } from "./badges";
import { EmployeePicker } from "./employee-picker";
import { SimpleSelect } from "./simple-select";
import type { Project, ProjectMember, ProjectPerson } from "../types";
import { addMembers, removeMember, updateMemberPercent } from "../work-api";
import { useCandidates, useOrgTeams, useSourceProjects, useWorkErrorMessage, useWorkMutation } from "../work-hooks";

const PERCENTS = [100, 75, 50, 25];
type Source = "team" | "project" | "person";

/**
 * Thêm thành viên trực tiếp: tạm thời, tới khi có phân bổ có duyệt (3.4). Không có bảng đội: chọn nguồn là team tổ chức
 * hoặc dự án cũ rồi tick từng người, nên dự án mới cần ít người hơn thì chỉ cần bỏ tick.
 */
export function ProjectStaffing({ project, members }: { project: Project; members: ProjectMember[] }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const [adding, setAdding] = useState(false);
  const fail = { onError: (error: unknown) => toast.error(errorMessage(error)) };
  const remove = useWorkMutation((employeeId: string) => removeMember(project.id, employeeId));
  const update = useWorkMutation(({ employeeId, percent }: { employeeId: string; percent: number }) =>
    updateMemberPercent(project.id, employeeId, percent),
  );
  const rows = members.filter((member) => member.role === "MEMBER");

  return (
    <div className="grid gap-3">
      <div>
        <Button variant="outline" onClick={() => setAdding(true)}>
          <UserPlusIcon /> {t("addMembers")}
        </Button>
      </div>
      {rows.length > 0 && (
        <ul className="divide-y rounded-lg border px-3">
          {rows.map((member) => (
            <li key={member.employee.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <PersonChip person={member.employee} />
              </span>
              <SimpleSelect
                size="sm"
                className="w-24"
                value={String(member.allocationPercent ?? 100)}
                onChange={(value) => update.mutate({ employeeId: member.employee.id, percent: Number(value) }, fail)}
                options={[...new Set([...PERCENTS, member.allocationPercent ?? 100])].map((value) => ({ value: String(value), label: `${value}%` }))}
              />
              <Button size="icon-sm" variant="ghost" aria-label={t("removeMember")} onClick={() => remove.mutate(member.employee.id, fail)}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddMembersDialog project={project} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddMembersDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const t = useTranslations("ProjectWork");
  const tCommon = useTranslations("Common");
  const errorMessage = useWorkErrorMessage();
  const [source, setSource] = useState<Source>("team");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [person, setPerson] = useState<ProjectPerson | null>(null);
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState("100");
  const teams = useOrgTeams(source === "team");
  const projects = useSourceProjects(source === "project");
  const candidates = useCandidates(project.id, source === "team" ? sourceId : null, source === "project" ? sourceId : null);

  const options = useMemo(() => {
    if (source === "team") return (teams.data ?? []).map((team) => ({ value: team.id, label: `${team.name} · ${team.departmentName}` }));
    return (projects.data?.content ?? [])
      .filter((item) => item.id !== project.id)
      .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  }, [source, teams.data, projects.data, project.id]);

  const available = (candidates.data ?? []).filter((candidate) => !candidate.alreadyInProject);
  const picked = source === "person" ? (person ? [person.id] : []) : available.map((c) => c.person.id).filter((id) => !unticked.has(id));
  const add = useWorkMutation(() => addMembers(project.id, picked, Number(percent)));

  function chooseSource(next: string) {
    setSource(next as Source);
    setSourceId(null);
    setUnticked(new Set());
  }

  function toggle(id: string) {
    const next = new Set(unticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setUnticked(next);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addMembers")}</DialogTitle>
          <DialogDescription>{t("addMembersHint")}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="staff-source">{t("sourceLabel")}</FieldLabel>
              <SimpleSelect
                id="staff-source"
                className="w-full"
                value={source}
                onChange={chooseSource}
                options={[
                  { value: "team", label: t("sourceTeam") },
                  { value: "project", label: t("sourceProject") },
                  { value: "person", label: t("sourcePerson") },
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-percent">{t("allocation")}</FieldLabel>
              <SimpleSelect
                id="staff-percent"
                className="w-full"
                value={percent}
                onChange={setPercent}
                options={PERCENTS.map((value) => ({ value: String(value), label: `${value}%` }))}
              />
            </Field>
          </div>
          {source === "person" ? (
            <Field>
              <FieldLabel htmlFor="staff-person">{t("person")}</FieldLabel>
              <EmployeePicker id="staff-person" value={person} onChange={setPerson} />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="staff-from">{t(source === "team" ? "pickTeam" : "pickProject")}</FieldLabel>
              <SimpleSelect
                id="staff-from"
                className="w-full"
                value={sourceId}
                onChange={(value) => {
                  setSourceId(value);
                  setUnticked(new Set());
                }}
                options={options}
              />
            </Field>
          )}
          {source !== "person" && sourceId && (
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {(candidates.data ?? []).map((candidate) => (
                <li key={candidate.person.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={candidate.alreadyInProject || !unticked.has(candidate.person.id)}
                    disabled={candidate.alreadyInProject}
                    onCheckedChange={() => toggle(candidate.person.id)}
                    aria-label={candidate.person.fullName}
                  />
                  <PersonChip person={candidate.person} />
                  {candidate.alreadyInProject && <Badge variant="secondary">{t("alreadyInProject")}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={picked.length === 0 || add.isPending}
            onClick={() =>
              add.mutate(undefined, {
                onSuccess: (count) => {
                  toast.success(t("membersAdded", { count }));
                  onClose();
                },
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          >
            {t("addCount", { count: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
