"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ALLOCATION_PERCENTS,
  allApplied,
  defaultPeriod,
  hasRoomFor,
  periodProblem,
  pickedByDefault,
  pickedIds,
} from "../allocation-rules";
import { useProjectErrorMessage } from "../hooks";
import type { Project, ProjectMember, ProjectPerson } from "../types";
import { endAllocation, proposeAllocation } from "../work-api";
import { useAvailability, useCandidates, useOrgTeams, useSourceProjects, useWorkMutation } from "../work-hooks";
import { PersonChip } from "./badges";
import { EmployeePicker } from "./employee-picker";
import { SimpleSelect } from "./simple-select";

type Source = "team" | "project" | "person";
const NOTE_MAX = 500;

type ProposeAllocationDialogProps = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có người: đổi % hoặc gia hạn cho người đó; không có: chọn người từ team, dự án khác hoặc từng người. */
  person?: ProjectPerson | null;
  /** % đang có của người đó, làm mức chọn sẵn; không có thì 100%. */
  percent?: number | null;
};

/**
 * Đề xuất phân bổ (3.4): "từ ngày A đến ngày B, X%". Trưởng phòng của từng người và PM cùng duyệt ở trang Phê duyệt; bên
 * tạo coi như đã đồng ý. Tổng của một người không vượt 100%, tính cả đề xuất đang chờ: danh sách hiện % còn trống.
 */
export function ProposeAllocationDialog({ project, open, onOpenChange, person, percent }: ProposeAllocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <ProposeForm
            project={project}
            initialPerson={person ?? null}
            initialPercent={percent ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ProposeFormProps = {
  project: Project;
  initialPerson: ProjectPerson | null;
  initialPercent: number | null;
  onDone: () => void;
};

function ProposeForm({ project, initialPerson, initialPercent, onDone }: ProposeFormProps) {
  const t = useTranslations("Allocations");
  const tCommon = useTranslations("Common");
  const errorMessage = useProjectErrorMessage();
  const today = todayIsoDate();
  const initial = defaultPeriod(project, today);
  const [source, setSource] = useState<Source>(initialPerson ? "person" : "team");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [person, setPerson] = useState<ProjectPerson | null>(initialPerson);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to ?? "");
  const [percent, setPercent] = useState(String(initialPercent ?? 100));
  const [note, setNote] = useState("");
  const [choices, setChoices] = useState<ReadonlyMap<string, boolean>>(new Map());

  const period = { from, to: to || null };
  const problem = from ? periodProblem(project, today, period) : "fromBeforeToday";
  // Chỉ hỏi % còn trống khi khoảng ngày hợp lệ, để không gọi API với khoảng backend sẽ từ chối.
  const asked = problem === null ? period : { from: null, to: null };
  const level = Number(percent);
  const teams = useOrgTeams(source === "team");
  const projects = useSourceProjects(source === "project");
  const candidates = useCandidates(project.id, {
    sourceTeamId: source === "team" ? sourceId : null,
    sourceProjectId: source === "project" ? sourceId : null,
    from: asked.from,
    to: asked.to,
  });
  const availability = useAvailability(project.id, source === "person" ? (person?.id ?? null) : null, asked.from, asked.to);

  const options = useMemo(() => {
    if (source === "team") return (teams.data ?? []).map((team) => ({ value: team.id, label: `${team.name} · ${team.departmentName}` }));
    return (projects.data?.content ?? [])
      .filter((item) => item.id !== project.id)
      .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  }, [source, teams.data, projects.data, project.id]);

  const list = candidates.data ?? [];
  const personFree = availability.data?.freePercent;
  const personShort = source === "person" && personFree !== undefined && personFree < level;
  const picked = source === "person" ? (person && !personShort ? [person.id] : []) : pickedIds(list, level, choices);
  const propose = useWorkMutation(() =>
    proposeAllocation(project.id, {
      employeeIds: picked,
      percent: level,
      fromDate: from,
      toDate: period.to,
      note: note.trim() || null,
    }),
  );

  function chooseSource(next: string) {
    setSource(next as Source);
    setSourceId(null);
    setChoices(new Map());
  }

  function toggle(id: string, current: boolean) {
    setChoices((previous) => new Map(previous).set(id, !current));
  }

  function submit() {
    propose.mutate(undefined, {
      onSuccess: (requests) => {
        toast.success(allApplied(requests) ? t("applied", { count: requests.length }) : t("sent", { count: requests.length }));
        onDone();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialPerson ? t("changeTitle", { name: initialPerson.fullName }) : t("proposeTitle")}</DialogTitle>
        <DialogDescription>{initialPerson ? t("changeHint") : t("proposeHint")}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        {!initialPerson && (
          <Field>
            <FieldLabel htmlFor="alloc-source">{t("source")}</FieldLabel>
            <SimpleSelect
              id="alloc-source"
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
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={problem === "fromBeforeToday" || problem === "beforeProjectStart"}>
            <FieldLabel htmlFor="alloc-from">{t("fromDate")}</FieldLabel>
            <Input id="alloc-from" type="date" min={initial.from} value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field data-invalid={problem === "endRequired" || problem === "afterProjectEnd" || problem === "endBeforeStart"}>
            <FieldLabel htmlFor="alloc-to">{t("toDate")}</FieldLabel>
            <Input
              id="alloc-to"
              type="date"
              min={from || undefined}
              max={project.endDate ?? undefined}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="alloc-percent">{t("percent")}</FieldLabel>
            <SimpleSelect
              id="alloc-percent"
              className="w-full"
              value={percent}
              onChange={setPercent}
              options={ALLOCATION_PERCENTS.map((value) => ({ value: String(value), label: `${value}%` }))}
            />
          </Field>
        </div>
        {problem ? (
          <FieldError>{t(`Period.${problem}`)}</FieldError>
        ) : (
          !project.endDate && !to && <FieldDescription>{t("noEndHint")}</FieldDescription>
        )}

        {source === "person" ? (
          <Field>
            {!initialPerson && <FieldLabel htmlFor="alloc-person">{t("person")}</FieldLabel>}
            {initialPerson ? (
              <PersonChip person={initialPerson} />
            ) : (
              <EmployeePicker id="alloc-person" value={person} onChange={setPerson} />
            )}
            {person && personFree !== undefined && (
              <FieldDescription className={cn(personShort && "text-destructive")}>
                {personShort ? t("notEnough", { percent: personFree }) : t("freeInPeriod", { percent: personFree })}
              </FieldDescription>
            )}
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="alloc-from-source">{t(source === "team" ? "pickTeam" : "pickProject")}</FieldLabel>
            <SimpleSelect
              id="alloc-from-source"
              className="w-full"
              value={sourceId}
              onChange={(value) => {
                setSourceId(value);
                setChoices(new Map());
              }}
              options={options}
            />
          </Field>
        )}

        {source !== "person" && sourceId && (
          <div className="grid gap-1">
            {candidates.isPending ? (
              <Spinner className="mx-auto" />
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noCandidates")}</p>
            ) : (
              <ul className="grid max-h-64 gap-1 overflow-y-auto">
                {list.map((candidate) => {
                  const room = hasRoomFor(candidate, level);
                  const checked = room && (choices.get(candidate.person.id) ?? pickedByDefault(candidate, level));
                  return (
                    <li key={candidate.person.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={!room}
                        onCheckedChange={() => toggle(candidate.person.id, checked)}
                        aria-label={candidate.person.fullName}
                      />
                      <span className="min-w-0 flex-1">
                        <PersonChip person={candidate.person} />
                      </span>
                      {candidate.alreadyInProject && <Badge variant="secondary">{t("inProject")}</Badge>}
                      {candidate.freePercent !== null && (
                        <span className={cn("text-xs tabular-nums", room ? "text-muted-foreground" : "text-destructive")}>
                          {t("free", { percent: candidate.freePercent })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="alloc-note">{t("note")}</FieldLabel>
          <Textarea
            id="alloc-note"
            rows={2}
            maxLength={NOTE_MAX}
            placeholder={t("notePlaceholder")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {tCommon("cancel")}
        </Button>
        <Button disabled={!!problem || picked.length === 0 || propose.isPending} onClick={submit}>
          {propose.isPending && <Spinner />}
          {t("submit", { count: picked.length })}
        </Button>
      </DialogFooter>
    </>
  );
}

type EndAllocationDialogProps = {
  project: Project;
  /** Dòng thành viên cần kết thúc; null = đóng hộp thoại. */
  member: ProjectMember | null;
  onClose: () => void;
};

/** Kết thúc sớm phân bổ: không cần duyệt, vì chỉ trả lại thời gian. */
export function EndAllocationDialog({ project, member, onClose }: EndAllocationDialogProps) {
  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">{member && <EndForm project={project} member={member} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function EndForm({ project, member, onDone }: { project: Project; member: ProjectMember; onDone: () => void }) {
  const t = useTranslations("Allocations");
  const tCommon = useTranslations("Common");
  const errorMessage = useProjectErrorMessage();
  const today = todayIsoDate();
  const [mode, setMode] = useState<"date" | "now">("date");
  const [lastDay, setLastDay] = useState(today);
  const invalid = mode === "date" && (!lastDay || lastDay < today);
  const end = useWorkMutation(() => endAllocation(project.id, member.employee.id, mode === "now" ? null : lastDay));

  function submit() {
    end.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("ended"));
        onDone();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("endTitle", { name: member.employee.fullName })}</DialogTitle>
        <DialogDescription>{t("endHint")}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="alloc-end-mode">{t("endWhen")}</FieldLabel>
          <SimpleSelect
            id="alloc-end-mode"
            className="w-full"
            value={mode}
            onChange={(value) => setMode(value as "date" | "now")}
            options={[
              { value: "date", label: t("endOnDate") },
              { value: "now", label: t("endNow") },
            ]}
          />
          {mode === "now" && <FieldDescription>{t("endNowHint")}</FieldDescription>}
        </Field>
        {mode === "date" && (
          <Field data-invalid={invalid}>
            <FieldLabel htmlFor="alloc-last-day">{t("lastDay")}</FieldLabel>
            <Input id="alloc-last-day" type="date" min={today} value={lastDay} onChange={(event) => setLastDay(event.target.value)} />
            {invalid && <FieldError>{t("lastDayInvalid")}</FieldError>}
          </Field>
        )}
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {tCommon("cancel")}
        </Button>
        <Button variant="destructive" disabled={invalid || end.isPending} onClick={submit}>
          {end.isPending && <Spinner />}
          {t("end")}
        </Button>
      </DialogFooter>
    </>
  );
}
