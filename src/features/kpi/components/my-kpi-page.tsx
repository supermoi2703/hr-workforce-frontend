"use client";

import { LockKeyholeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, LoadingState } from "@/components/shared/states";
import { useMyKpi } from "../hooks";
import { KpiErrorState, KpiHeader, KpiPeriodLine, KpiStatus, useKpiMonth, type KpiPageProps } from "./common";
import { CountedTasks, ReviewScores } from "./review-content";

export function MyKpiPage({ initialMonth }: KpiPageProps) {
  const t = useTranslations("Kpi");
  const { month, valid, changeMonth } = useKpiMonth(initialMonth);
  const query = useMyKpi(month);

  return (
    <div className="space-y-6">
      <KpiHeader screen="mine" month={month} changeMonth={changeMonth} />
      {!valid ? <EmptyState title={t("pickMonth")} /> : query.isPending ? <LoadingState />
        : query.isError ? <KpiErrorState error={query.error} retry={() => void query.refetch()} /> : (
          <>
            <KpiPeriodLine status={query.data.periodStatus}
              deadline={query.data.visible ? undefined : query.data.lockDeadline} />
            {query.data.visible && query.data.review ? (
              <>
                {query.data.periodStatus !== "LOCKED" && <KpiStatus status={query.data.review.status} />}
                <ReviewScores review={query.data.review} />
                <CountedTasks tasks={query.data.tasks} />
              </>
            ) : (
              <EmptyState title={t(query.data.periodStatus ? "personalPending" : "noPersonalKpi")}
                icon={<LockKeyholeIcon />} description={query.data.periodStatus ? t("personalPendingHint") : undefined} />
            )}
          </>
        )}
    </div>
  );
}
