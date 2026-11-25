"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon, UserRoundSearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HeatTable } from "../components/allocation-team-view";
import { CandidateRow } from "../components/suggestion-rows";
import type { AssigneeSuggestions } from "../work-types";
import { understoodChips, visibleCandidates, type UnderstoodChip } from "./assistant-rules";
import { ASSISTANT_NOTES, type AssistantAnswer, type AssistantNote, type AssistantRisk, type RiskCode, type Understood } from "./types";

type Actions = {
  /** Mở hộp "Gợi ý người" của việc có sẵn với điều kiện đã hiểu. */
  onOpenSuggest: (understood: Understood) => void;
  /** Mở form tạo việc điền sẵn từ việc chưa tạo. */
  onCreateTask: (understood: Understood) => void;
  onOpenTask: (key: string) => void;
  onOpenPerson: (employeeId: string) => void;
  /** Hỏi một câu mẫu (câu chưa hỗ trợ / chưa rõ). */
  onAsk: (question: string) => void;
};

const RISK_TONE: Record<RiskCode, string> = {
  OVERDUE: "border-destructive/30 bg-destructive/10 text-destructive",
  ASSIGNEE_RED: "border-destructive/30 bg-destructive/10 text-destructive",
  ASSIGNEE_YELLOW: "border-warning/30 bg-warning/10 text-warning",
  UNASSIGNED_STARTING: "border-border bg-muted text-muted-foreground",
};

/**
 * Một câu trả lời của trợ lý phân bổ: chip "Trợ lý đã hiểu", ghi chú, rồi kết quả của lõi luật theo kiểu câu (người,
 * bảng tải, việc có nguy cơ) kèm nút đi tiếp. Mọi số liệu do lõi tính; trợ lý chỉ hiểu câu hỏi.
 */
export function AssistantAnswerView({ answer, actions }: { answer: AssistantAnswer; actions: Actions }) {
  const t = useTranslations("AllocationAi.assistant");
  const notes = answer.notes.filter((note): note is AssistantNote => (ASSISTANT_NOTES as readonly string[]).includes(note));
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 text-sm">
      <UnderstoodRow understood={answer.understood} />
      {notes.length > 0 && (
        <ul className="grid gap-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <li key={note}>{t(`notes.${note}`)}</li>
          ))}
        </ul>
      )}
      {answer.kind === "PEOPLE" && answer.people && (
        <PeopleResult people={answer.people} understood={answer.understood} actions={actions} />
      )}
      {answer.kind === "TEAM" && answer.team && (
        answer.team.people.length === 0 ? (
          <p className="text-muted-foreground">{t("team.empty")}</p>
        ) : (
          <div className="grid gap-2">
            <p className="text-xs text-muted-foreground">{t("team.hint", { count: answer.team.total })}</p>
            <div className="overflow-hidden rounded-md border">
              <HeatTable rows={answer.team.people} onOpenPerson={actions.onOpenPerson} compact />
            </div>
          </div>
        )
      )}
      {answer.kind === "RISKS" && answer.risks && <RiskResult risks={answer.risks} onOpenTask={actions.onOpenTask} />}
      {(answer.kind === "CLARIFY" || answer.kind === "UNSUPPORTED") && (
        <div className="grid gap-2">
          <p>{t(answer.kind === "CLARIFY" ? "clarify" : "unsupported")}</p>
          <Examples onAsk={actions.onAsk} />
        </div>
      )}
    </div>
  );
}

function UnderstoodRow({ understood }: { understood: Understood }) {
  const t = useTranslations("AllocationAi.assistant");
  const chips = understoodChips(understood);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t(`intent.${understood.intent}`)}</span>
      {chips.map((chip, index) => (
        <Badge
          key={index}
          variant="secondary"
          className={cn("font-normal", chip.kind === "unmatched" && "text-muted-foreground line-through")}
          title={chip.kind === "unmatched" ? t("chip.unmatchedHint") : undefined}
        >
          {chipText(t, chip)}
        </Badge>
      ))}
    </div>
  );
}

function chipText(t: ReturnType<typeof useTranslations<"AllocationAi.assistant">>, chip: UnderstoodChip): string {
  switch (chip.kind) {
    case "task":
      return chip.key;
    case "work":
      return t("chip.work", { text: chip.text });
    case "skill":
      return chip.minLevel != null ? t("chip.skillLevel", { name: chip.name, level: chip.minLevel }) : chip.name;
    case "unmatched":
      return chip.name;
    case "headcount":
      return t("chip.headcount", { count: chip.count });
    case "hours":
      return t("chip.hours", { hours: chip.hours });
    case "range":
      return `${formatDate(chip.from)} – ${formatDate(chip.to)}`;
    case "from":
      return t("chip.from", { date: formatDate(chip.from) });
    case "scope":
      return t(chip.scope === "ALL" ? "chip.scopeAll" : "chip.scopeProject");
    case "office":
      return chip.name;
  }
}

function PeopleResult({ people, understood, actions }: { people: AssigneeSuggestions; understood: Understood; actions: Actions }) {
  const t = useTranslations("AllocationAi.assistant");
  const tSuggest = useTranslations("Suggest");
  const [expanded, setExpanded] = useState(false);
  const everyone = [...people.members, ...people.outside];
  const { shown, hidden } = visibleCandidates(everyone, understood.headcount, expanded);
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        {t("people.period", { from: formatDate(people.from), to: formatDate(people.to) })}
      </p>
      {everyone.length === 0 ? (
        <p className="text-muted-foreground">{people.outsideNeedsSkills ? tSuggest("outsideNeedsSkills") : t("people.empty")}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {shown.map((candidate) => (
            <CandidateRow key={candidate.person.id} candidate={candidate}>
              {!candidate.member && <Badge variant="outline">{tSuggest("notMember")}</Badge>}
            </CandidateRow>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {hidden > 0 && (
          <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setExpanded(true)}>
            {t("people.more", { count: hidden })}
          </Button>
        )}
        {people.excluded.overloadedTotal > 0 && <span>{t("people.overloaded", { count: people.excluded.overloadedTotal })}</span>}
        {people.excluded.missingSkill > 0 && <span>{t("people.missingSkill", { count: people.excluded.missingSkill })}</span>}
      </div>
      <div className="flex justify-end">
        {understood.task ? (
          <Button size="sm" onClick={() => actions.onOpenSuggest(understood)}>
            <UserRoundSearchIcon /> {t("people.openToAssign")}
          </Button>
        ) : understood.virtualWork ? (
          <Button size="sm" onClick={() => actions.onCreateTask(understood)}>
            <PlusIcon /> {t("people.createTask")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RiskResult({ risks, onOpenTask }: { risks: AssistantRisk[]; onOpenTask: (key: string) => void }) {
  const t = useTranslations("AllocationAi.assistant");
  if (risks.length === 0) return <p className="text-muted-foreground">{t("risks.empty")}</p>;
  return (
    <ul className="divide-y rounded-md border">
      {risks.map((risk) => (
        <li key={risk.taskId}>
          <button
            type="button"
            onClick={() => onOpenTask(risk.key)}
            className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
          >
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{risk.key}</span>
                <span className="truncate font-medium">{risk.title}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {risk.assignee ? risk.assignee.fullName : t("risks.nobody")}
                {risk.end && ` · ${t("risks.due", { date: formatDate(risk.end) })}`}
              </span>
              <span className="flex flex-wrap gap-1">
                {risk.codes.map((code) => (
                  <span key={code} className={cn("rounded-md border px-1.5 py-0.5 text-[11px] font-medium", RISK_TONE[code])}>
                    {t(`risks.code.${code}`)}
                  </span>
                ))}
              </span>
            </span>
            <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export const EXAMPLE_KEYS = ["findPeople", "virtualWork", "team", "risks"] as const;

export function Examples({ onAsk, disabled, withTask }: { onAsk: (question: string) => void; disabled?: boolean; withTask?: boolean }) {
  const t = useTranslations("AllocationAi.assistant");
  const keys = withTask ? (["thisTask", ...EXAMPLE_KEYS] as const) : EXAMPLE_KEYS;
  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((key) => (
        <Button
          key={key}
          size="sm"
          variant="outline"
          className="h-auto max-w-full py-1.5 text-left whitespace-normal"
          disabled={disabled}
          onClick={() => onAsk(t(`examples.${key}`))}
        >
          {t(`examples.${key}`)}
        </Button>
      ))}
    </div>
  );
}
