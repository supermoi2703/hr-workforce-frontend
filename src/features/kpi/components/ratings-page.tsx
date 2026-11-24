"use client";

import { useId, useState } from "react";
import { LockKeyholeIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKpiMutation, useKpiRatings } from "../hooks";
import type { RatingProject, RatingTarget } from "../types";
import { KpiErrorState, KpiHeader, KpiPeriodLine, useKpiMonth, type KpiPageProps } from "./common";

export function RatingsPage({ initialMonth }: KpiPageProps) {
  const t = useTranslations("Kpi");
  const { month, valid, changeMonth } = useKpiMonth(initialMonth);
  const query = useKpiRatings(month);
  const [selected, select] = useState<{ projectId: string; employeeId: string } | null>(null);
  const project = query.data?.projects.find((item) => item.projectId === selected?.projectId);
  const target = project?.people.find((item) => item.employeeId === selected?.employeeId);

  return (
    <div className="space-y-6">
      <KpiHeader screen="ratings" month={month} changeMonth={(value) => { select(null); changeMonth(value); }} />
      {!valid ? <EmptyState title={t("pickMonth")} /> : query.isPending ? <LoadingState />
        : query.isError ? <KpiErrorState error={query.error} retry={() => void query.refetch()} /> : (
          <>
            <KpiPeriodLine status={query.data.periodStatus} />
            {!query.data.projects.length && <EmptyState title={t("noRatingTargets")} />}
            {query.data.projects.map((item) => (
              <section key={item.projectId} className="overflow-hidden rounded-xl border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <div>
                    <h2 className="font-semibold">{item.projectName ?? item.projectCode ?? "—"}</h2>
                    {item.projectName && item.projectCode && <p className="text-xs text-muted-foreground">{item.projectCode}</p>}
                  </div>
                  <Badge variant="outline">{t("peopleProgress", { rated: item.rated, total: item.total })}</Badge>
                </header>
                <ul className="divide-y">
                  {item.people.map((person) => (
                    <li key={person.employeeId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium">{person.employeeName ?? person.employeeCode ?? "—"}</p>
                        <p className="text-sm text-muted-foreground">{t("ratingWork", { count: person.taskCount, minutes: person.doneMinutes })}</p>
                        {person.note && <p className="mt-1 text-sm break-words whitespace-pre-wrap">{person.note}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={person.rating === null ? "secondary" : "info"}>
                          {person.rating === null ? t("unrated") : t("ratingValue", { rating: person.rating })}
                        </Badge>
                        {person.locked ? <Badge variant="success"><LockKeyholeIcon />{t("status.LOCKED")}</Badge>
                          : query.data.canRate && (
                            <Button size="sm" variant="outline" onClick={() => select({
                              projectId: item.projectId, employeeId: person.employeeId,
                            })}><PencilIcon />{t(person.rating === null ? "rate" : "editRating")}</Button>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      {project && target && selected && (
        <RatingDialog key={`${month}-${project.projectId}-${target.employeeId}`} month={month} project={project}
          target={target} canRate={Boolean(query.data?.canRate) && !target.locked} close={() => select(null)} />
      )}
    </div>
  );
}

function RatingDialog({ month, project, target, canRate, close }: {
  month: string; project: RatingProject; target: RatingTarget; canRate: boolean; close: () => void;
}) {
  const t = useTranslations("Kpi");
  const fieldId = useId();
  const [rating, setRating] = useState(target.rating === null ? "" : String(target.rating));
  const [note, setNote] = useState(target.note ?? "");
  const mutation = useKpiMutation();

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(target.rating === null ? "rate" : "editRating")}</DialogTitle>
          <DialogDescription>
            {target.employeeName ?? target.employeeCode ?? "—"} · {project.projectName ?? project.projectCode ?? "—"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (!rating || !canRate || mutation.isPending) return;
          mutation.mutate({
            type: "rate",
            input: { month, projectId: project.projectId, employeeId: target.employeeId, rating: Number(rating), note: note.trim() || null },
          }, { onSuccess: close });
        }}>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-rating`}>{t("rating")}</Label>
            <ChoiceSelect id={`${fieldId}-rating`} value={rating} onChange={setRating} placeholder={t("pickRating")}
              choices={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: t("ratingValue", { rating: value }) }))}
              disabled={!canRate || mutation.isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-note`}>{t("note")}</Label>
            <Textarea id={`${fieldId}-note`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
              disabled={!canRate || mutation.isPending} />
          </div>
          <Button type="submit" disabled={!rating || !canRate || mutation.isPending}>{t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
