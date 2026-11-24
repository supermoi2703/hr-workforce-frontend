"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { useKpiTeam } from "../hooks";
import { KpiErrorState, KpiHeader, KpiPeriodLine, useKpiMonth, type KpiPageProps } from "./common";
import { ReviewDialog } from "./review-dialog";
import { ReviewTable } from "./review-table";

export function ReviewsPage({ initialMonth }: KpiPageProps) {
  const t = useTranslations("Kpi");
  const { month, valid, changeMonth } = useKpiMonth(initialMonth);
  const [review, setReview] = useState<string | null>(null);
  const query = useKpiTeam(month);

  return (
    <div className="space-y-6">
      <KpiHeader screen="reviews" month={month} changeMonth={(value) => { setReview(null); changeMonth(value); }} />
      {!valid ? <EmptyState title={t("pickMonth")} /> : query.isPending ? <LoadingState />
        : query.isError ? <KpiErrorState error={query.error} retry={() => void query.refetch()} /> : (
          <>
            <KpiPeriodLine status={query.data.periodStatus} deadline={query.data.lockDeadline} />
            {query.data.periodStatus === "REVIEW" && !query.data.timesheetLocked && (
              <p className="rounded-lg border bg-card p-3 text-sm">{t("errors.timesheetNotLocked")}</p>
            )}
            {query.data.items.length ? <ReviewTable reviews={query.data.items} onSelect={setReview} />
              : <EmptyState title={t("noTeamReviews")} />}
          </>
        )}
      {review && <ReviewDialog key={review} id={review} close={() => setReview(null)} />}
    </div>
  );
}
