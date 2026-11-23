"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { useOrgOffices } from "../hooks";
import type { Project } from "../types";
import { assignTask, getAssignPreview, getTask } from "../work-api";
import { useSuggestions, useWorkErrorMessage, useWorkMutation } from "../work-hooks";
import { assignWarning, hoursText, needsConfirm, skillFitText, suggestionLines, type SuggestionLine } from "../work-rules";
import type { AssignPreview, Person, SuggestionCandidate, Task } from "../work-types";
import { ProposeAllocationDialog } from "./allocation-dialogs";
import { PersonChip } from "./badges";
import { LoadLine, ZoneDot } from "./load-summary";
import { SimpleSelect } from "./simple-select";

const OUTSIDE_PAGE = 10;
const OUTSIDE_MAX = 50;
const ALL_OFFICES = "all";

type SuggestAssigneeDialogProps = { project: Project; taskId: string; taskKey: string; onClose: () => void };

/**
 * Gợi ý người cho một việc (workload bước 4, backend README module project mục 7.3): thành viên dự án và người ngoài dự án
 * có đủ kỹ năng, xếp theo vùng tải nếu nhận việc này, kèm lý do. Hệ thống không tự giao: PM chọn "Giao" (thành viên) hoặc
 * "Đề xuất vào dự án" (người ngoài, cần duyệt trước khi giao). Người đỏ không vào danh sách, cuối hộp mở ra xem được.
 */
export function SuggestAssigneeDialog({ project, taskId, taskKey, onClose }: SuggestAssigneeDialogProps) {
  const t = useTranslations("Suggest");
  const tWork = useTranslations("ProjectWork");
  const tLoad = useTranslations("Workload");
  const errorMessage = useWorkErrorMessage();
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [outsideLimit, setOutsideLimit] = useState(OUTSIDE_PAGE);
  const [showOverloaded, setShowOverloaded] = useState(false);
  const [proposing, setProposing] = useState<Person | null>(null);
  const [confirming, setConfirming] = useState<{ person: Person; task: Task } | null>(null);
  const suggestions = useSuggestions(taskId, { officeId, outsideLimit });
  const offices = useOrgOffices();
  const assign = useWorkMutation(({ person, task }: { person: Person; task: Task }) => assignTask(taskId, person.id, task.card.version));

  function done(person: Person, preview: AssignPreview | null) {
    const warning = assignWarning(preview);
    toast.success(tWork("assignedTo", { name: person.fullName }));
    if (warning?.zone === "YELLOW" && warning.peak) {
      toast.warning(
        tLoad("assignYellow", {
          name: person.fullName,
          week: formatDate(warning.peak.weekStart),
          load: hoursText(warning.peak.loadMinutes),
          capacity: hoursText(warning.peak.capacityMinutes),
          percent: warning.peak.percent == null ? "—" : `${warning.peak.percent}%`,
        }),
      );
    }
    onClose();
  }

  // Xem trước tải ngay lúc giao (dữ liệu có thể đã đổi từ khi mở hộp): đỏ thì hỏi xác nhận, vàng giao kèm cảnh báo.
  async function choose(person: Person) {
    try {
      const task = await getTask(taskKey);
      let preview: AssignPreview | null = null;
      try {
        preview = await getAssignPreview(task.projectId, {
          taskId,
          employeeId: person.id,
          estimateMinutes: task.card.estimateMinutes,
          startDate: task.card.startDate,
          dueDate: task.card.dueDate,
          sprintId: task.card.sprintId,
        });
      } catch {
        // Không xem trước được thì vẫn giao: tải chỉ để cảnh báo
      }
      if (needsConfirm(preview)) {
        setConfirming({ person, task });
        return;
      }
      assign.mutate({ person, task }, { onSuccess: () => done(person, preview), onError: (error) => toast.error(errorMessage(error)) });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const data = suggestions.data;
  const withTask = data ? data.scheduled && !data.missingEstimate : false;
  const officeOptions = [
    { value: ALL_OFFICES, label: t("allOffices") },
    ...(offices.data ?? []).map((office) => ({ value: office.id, label: office.name })),
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title", { key: taskKey })}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        {suggestions.isPending ? (
          <LoadingState />
        ) : suggestions.isError ? (
          <ErrorState error={suggestions.error} onRetry={() => suggestions.refetch()} />
        ) : data ? (
          <div className="grid gap-5 text-sm">
            <p className="text-muted-foreground text-xs">
              {withTask ? t("period", { from: formatDate(data.from), to: formatDate(data.to) }) : t("currentLoadOnly")}
            </p>

            <section className="grid gap-2" aria-labelledby="suggest-members">
              <h3 id="suggest-members" className="font-medium">
                {t("members", { count: data.members.length })}
              </h3>
              {data.members.length === 0 ? (
                <p className="text-muted-foreground">{t("noMembers")}</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {data.members.map((candidate) => (
                    <CandidateRow key={candidate.person.id} candidate={candidate}>
                      <Button size="sm" variant="outline" disabled={assign.isPending} onClick={() => void choose(candidate.person)}>
                        {tWork("assign")}
                      </Button>
                    </CandidateRow>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid gap-2" aria-labelledby="suggest-outside">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="suggest-outside" className="font-medium">
                  {t("outside", { count: data.outsideTotal })}
                </h3>
                {!data.outsideNeedsSkills && (
                  <SimpleSelect
                    size="sm"
                    className="w-48"
                    value={officeId ?? ALL_OFFICES}
                    onChange={(value) => {
                      setOfficeId(value === ALL_OFFICES ? null : value);
                      setOutsideLimit(OUTSIDE_PAGE);
                    }}
                    options={officeOptions}
                  />
                )}
              </div>
              {data.outsideNeedsSkills ? (
                <p className="text-muted-foreground">{t("outsideNeedsSkills")}</p>
              ) : data.outside.length === 0 ? (
                <p className="text-muted-foreground">{t("noOutside")}</p>
              ) : (
                <>
                  <ul className="divide-y rounded-md border">
                    {data.outside.map((candidate) => (
                      <CandidateRow key={candidate.person.id} candidate={candidate}>
                        {project.can.manageMembers ? (
                          <Button size="sm" variant="outline" onClick={() => setProposing(candidate.person)}>
                            {t("proposeJoin")}
                          </Button>
                        ) : (
                          <Badge variant="secondary">{t("notMember")}</Badge>
                        )}
                      </CandidateRow>
                    ))}
                  </ul>
                  {data.outsideTotal > data.outside.length && outsideLimit < OUTSIDE_MAX && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="justify-self-start"
                      disabled={suggestions.isFetching}
                      onClick={() => setOutsideLimit((limit) => Math.min(OUTSIDE_MAX, limit + OUTSIDE_PAGE))}
                    >
                      {t("showMore", { count: data.outsideTotal - data.outside.length })}
                    </Button>
                  )}
                </>
              )}
            </section>

            {(data.excluded.missingSkill > 0 || data.excluded.overloadedTotal > 0) && (
              <section className="text-muted-foreground grid gap-1 border-t pt-3 text-xs">
                {data.excluded.missingSkill > 0 && <p>{t("excludedMissingSkill", { count: data.excluded.missingSkill })}</p>}
                {data.excluded.overloadedTotal > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto justify-self-start p-0 text-xs"
                      aria-expanded={showOverloaded}
                      onClick={() => setShowOverloaded((shown) => !shown)}
                    >
                      {t(showOverloaded ? "hideOverloaded" : "excludedOverloaded", { count: data.excluded.overloadedTotal })}
                    </Button>
                    {showOverloaded && (
                      <ul className="grid gap-1">
                        {data.excluded.overloaded.map((item) => (
                          <li key={item.person.id} className="flex flex-wrap items-center gap-2">
                            <PersonChip person={item.person} />
                            <LoadLine load={item.load} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        ) : null}

        {proposing && (
          <ProposeAllocationDialog
            project={project}
            open
            onOpenChange={(open) => !open && setProposing(null)}
            person={{ ...proposing, employeeCode: proposing.employeeCode ?? "" }}
            intent="join"
            initialPeriod={withTask && data ? { from: data.from, to: data.to } : null}
          />
        )}
        <ConfirmDialog
          open={!!confirming}
          onOpenChange={(open) => !open && setConfirming(null)}
          title={tLoad("confirmTitle", { name: confirming?.person.fullName ?? "" })}
          description={tLoad("confirmDescription", { name: confirming?.person.fullName ?? "" })}
          confirmLabel={tLoad("confirmAction")}
          destructive
          onConfirm={() =>
            confirming
              ? assign
                  .mutateAsync(confirming)
                  .then(() => done(confirming.person, null))
                  .catch((failure) => {
                    toast.error(errorMessage(failure));
                    throw failure;
                  })
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/** Một người được gợi ý: tên, chấm vùng, tối đa 3 dòng lý do, nút hành động bên phải. */
function CandidateRow({ candidate, children }: { candidate: SuggestionCandidate; children: ReactNode }) {
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

function ReasonLine({ line }: { line: SuggestionLine }) {
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
