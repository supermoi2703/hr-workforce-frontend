"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assignTask, getAssignPreview, getTask } from "../work-api";
import { useWorkErrorMessage, useWorkMutation, useSuggestions } from "../work-hooks";
import { assignWarning, formatMinutes, hoursText, needsConfirm } from "../work-rules";
import type { AssignPreview, Suggestion, Task } from "../work-types";
import { PersonChip } from "./badges";

/**
 * Gợi ý người thay thế bằng luật. Hệ thống không tự giao: PM luôn là người quyết định. Trước khi giao xem trước tải của người
 * đó (workload bước 3): đỏ thì hỏi xác nhận, vàng thì giao kèm cảnh báo "cần thỏa thuận". Không chặn.
 */
export function ReassignDialog({ taskId, taskKey, onClose }: { taskId: string; taskKey: string; onClose: () => void }) {
  const t = useTranslations("ProjectWork");
  const tLoad = useTranslations("Workload");
  const errorMessage = useWorkErrorMessage();
  const suggestions = useSuggestions(taskId);
  const [confirming, setConfirming] = useState<{ person: Suggestion; task: Task } | null>(null);
  const assign = useWorkMutation(({ person, task }: { person: Suggestion; task: Task }) =>
    assignTask(taskId, person.person.id, task.card.version),
  );

  function done(person: Suggestion, preview: AssignPreview | null) {
    const warning = assignWarning(preview);
    toast.success(t("assignedTo", { name: person.person.fullName }));
    if (warning?.zone === "YELLOW" && warning.peak) {
      toast.warning(
        tLoad("assignYellow", {
          name: person.person.fullName,
          week: formatDate(warning.peak.weekStart),
          load: hoursText(warning.peak.loadMinutes),
          capacity: hoursText(warning.peak.capacityMinutes),
          percent: warning.peak.percent == null ? "—" : `${warning.peak.percent}%`,
        }),
      );
    }
    onClose();
  }

  async function choose(person: Suggestion) {
    try {
      const task = await getTask(taskKey);
      let preview: AssignPreview | null = null;
      try {
        preview = await getAssignPreview(task.projectId, {
          taskId,
          employeeId: person.person.id,
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("reassignTitle", { key: taskKey })}</DialogTitle>
          <DialogDescription>{t("reassignHint")}</DialogDescription>
        </DialogHeader>
        {suggestions.isPending ? (
          <LoadingState />
        ) : suggestions.isError ? (
          <ErrorState error={suggestions.error} onRetry={() => suggestions.refetch()} />
        ) : suggestions.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noSuggestions")}</p>
        ) : (
          <ul className="divide-y">
            {suggestions.data.map((item) => (
              <li key={item.person.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-40 flex-1">
                  <PersonChip person={item.person} />
                </span>
                {item.requiredSkills > 0 && (
                  <Badge variant={item.matchedSkills === item.requiredSkills ? "success" : "secondary"}>
                    {t("skillsMatched", { matched: item.matchedSkills, total: item.requiredSkills })}
                  </Badge>
                )}
                <Badge variant={item.enoughTime ? "success" : "warning"}>{t("freeTime", { time: formatMinutes(item.freeMinutes) })}</Badge>
                {item.onLeaveOnDue && <Badge variant="destructive">{t("leaveOnDue")}</Badge>}
                {!item.onLeaveOnDue && item.leaveDays > 0 && <Badge variant="warning">{t("leaveDays", { days: item.leaveDays })}</Badge>}
                <Button
                  size="sm"
                  disabled={assign.isPending}
                  onClick={() => void choose(item)}
                >
                  {t("assign")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <ConfirmDialog
          open={!!confirming}
          onOpenChange={(open) => !open && setConfirming(null)}
          title={tLoad("confirmTitle", { name: confirming?.person.person.fullName ?? "" })}
          description={tLoad("confirmDescription", { name: confirming?.person.person.fullName ?? "" })}
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
