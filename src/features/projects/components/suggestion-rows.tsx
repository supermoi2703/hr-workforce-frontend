"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { hoursText, skillFitText, suggestionLines, type SuggestionLine } from "../work-rules";
import type { SuggestionCandidate } from "../work-types";
import { PersonChip } from "./badges";
import { ZoneDot } from "./load-summary";

/** Một người được gợi ý: tên, chấm vùng, tối đa 3 dòng lý do, nút hành động bên phải. */
export function CandidateRow({ candidate, children }: { candidate: SuggestionCandidate; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <ZoneDot zone={candidate.load.zone} className="mt-1.5" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <PersonChip person={candidate.person} />
        {suggestionLines(candidate).map((line, index) => (
          <ReasonLine key={index} line={line} />
        ))}
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

export function ReasonLine({ line }: { line: SuggestionLine }) {
  const t = useTranslations("Suggest");
  const tLoad = useTranslations("Workload");
  const className = "text-muted-foreground text-xs";
  if (line.kind === "skills") {
    const text = skillFitText(line.skills, (min) => t("belowMin", { min }));
    return (
      <p className={className}>
        {t("skills", { skills: text })}
        {line.unconfirmed && ` · ${t("unconfirmed")}`}
      </p>
    );
  }
  if (line.kind === "peak") {
    return (
      <p className={line.week.zone === "GREEN" ? `${className} tabular-nums` : "text-warning text-xs tabular-nums"}>
        {tLoad("peak", { week: formatDate(line.week.weekStart), load: hoursText(line.week.loadMinutes), capacity: hoursText(line.week.capacityMinutes) })}
      </p>
    );
  }
  const reason = line.reason;
  switch (reason.code) {
    case "ENDS_BEFORE_START":
      return (
        <p className={className}>
          {reason.taskKey
            ? t("reason.endsSameProject", { key: reason.taskKey, date: formatDate(reason.date) })
            : t("reason.endsOtherProject", { date: formatDate(reason.date) })}
        </p>
      );
    case "LEAVE_IN_RANGE":
      return <p className={className}>{t("reason.leaveInRange", { days: reason.amount ?? 0 })}</p>;
    case "UNSCHEDULED_WORK":
      return <p className={className}>{t("reason.unscheduled", { hours: hoursText(reason.amount ?? 0) })}</p>;
    case "LEAVE_ON_DUE":
      return <p className="text-destructive text-xs">{t("reason.leaveOnDue")}</p>;
    default:
      return null;
  }
}
