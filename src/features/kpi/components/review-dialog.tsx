"use client";

import { useState } from "react";
import { LockKeyholeIcon, LockKeyholeOpenIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKpiMutation, useKpiReview } from "../hooks";
import { KpiErrorState, KpiStatus } from "./common";
import { ReasonForm } from "./reason-form";
import { CountedTasks, ProjectRatings, ReviewScores } from "./review-content";

export function ReviewDialog({ id, close }: { id: string; close: () => void }) {
  const t = useTranslations("Kpi");
  const query = useKpiReview(id);
  const mutation = useKpiMutation();
  const [form, setForm] = useState<"adjust" | "unlock" | null>(null);
  const review = query.data?.review;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{review?.employeeName ?? t("reviewDetail")}</DialogTitle>
          <DialogDescription>
            {review?.employeeCode ? `${t("reviewDetail")} · ${review.employeeCode}` : t("reviewDetail")}
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? <LoadingState /> : query.isError ? (
          <KpiErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          <div className="space-y-5">
            <KpiStatus status={query.data.review.status} />
            <ReviewScores review={query.data.review} />
            {query.data.review.canAdjust && !query.data.timesheetLocked && (
              <p className="rounded-lg border bg-muted/50 p-3 text-sm">{t("errors.timesheetNotLocked")}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {query.data.review.canAdjust && (
                <Button variant="outline" disabled={mutation.isPending} aria-expanded={form === "adjust"}
                  onClick={() => setForm(form === "adjust" ? null : "adjust")}><PencilIcon />{t("editAdjustment")}</Button>
              )}
              {query.data.review.canLock && (
                <ConfirmDialog trigger={<Button disabled={mutation.isPending} />} triggerLabel={<><LockKeyholeIcon />{t("lock")}</>}
                  title={t("lock")} description={t("lockReviewConfirm")} confirmLabel={t("lock")}
                  onConfirm={() => mutation.mutateAsync({ type: "lockReview", id }, { onSuccess: () => setForm(null) })} />
              )}
              {query.data.review.canUnlock && (
                <Button variant="outline" disabled={mutation.isPending} aria-expanded={form === "unlock"}
                  onClick={() => setForm(form === "unlock" ? null : "unlock")}><LockKeyholeOpenIcon />{t("unlock")}</Button>
              )}
            </div>
            {form === "adjust" && query.data.review.canAdjust && (
              <div className="rounded-lg border p-4">
                <ReasonForm type="adjust" cap={query.data.maxCoefficient} adjusted={query.data.review.adjustedCoefficient}
                  pending={mutation.isPending} save={(input) => mutation.mutate({ type: "adjust", id, input },
                    { onSuccess: () => setForm(null) })} />
              </div>
            )}
            {form === "unlock" && query.data.review.canUnlock && (
              <div className="rounded-lg border p-4">
                <ReasonForm type="unlock" pending={mutation.isPending} save={(reason) => mutation.mutate({
                  type: "unlockReview", id, reason,
                }, { onSuccess: () => setForm(null) })} />
              </div>
            )}
            <ProjectRatings ratings={query.data.ratings} />
            <CountedTasks tasks={query.data.tasks} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
