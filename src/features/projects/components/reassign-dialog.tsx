"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assignTask, getTask } from "../api";
import { useProjectErrorMessage, useProjectMutation, useSuggestions } from "../hooks";
import { formatMinutes } from "../rules";
import type { Suggestion } from "../types";
import { PersonChip } from "./badges";

/** Gợi ý người thay thế bằng luật. Hệ thống không tự giao: PM luôn là người quyết định. */
export function ReassignDialog({ taskId, taskKey, onClose }: { taskId: string; taskKey: string; onClose: () => void }) {
  const t = useTranslations("Projects");
  const errorMessage = useProjectErrorMessage();
  const suggestions = useSuggestions(taskId);
  const assign = useProjectMutation(async (person: Suggestion) => {
    const task = await getTask(taskKey);
    return assignTask(taskId, person.person.id, task.card.version);
  });

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
                  onClick={() =>
                    assign.mutate(item, {
                      onSuccess: () => {
                        toast.success(t("assignedTo", { name: item.person.fullName }));
                        onClose();
                      },
                      onError: (error) => toast.error(errorMessage(error)),
                    })
                  }
                >
                  {t("assign")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
