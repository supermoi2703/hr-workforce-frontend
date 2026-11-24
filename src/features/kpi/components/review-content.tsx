"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { ProjectRating, ReviewRow, ReviewTask } from "../types";

export function ReviewScores({ review }: { review: ReviewRow }) {
  const t = useTranslations("Kpi");
  const scores = [
    { label: t("onTime"), score: review.onTimeScore, context: t("onTimeMinutes", { onTime: review.onTimeMinutes, total: review.taskMinutes }) },
    { label: t("attendance"), score: review.attendanceScore, context: t("attendanceDays", {
      paid: formatNumber(review.paidUnits), standard: formatNumber(review.standardDays),
    }) },
    { label: t("pmScore"), score: review.ratingScore, context: t("ratingProgress", {
      rated: review.ratedProjects, total: review.ratingProjects,
    }) },
    { label: t("machine"), score: review.machineCoefficient },
    { label: t("adjusted"), score: review.adjustedCoefficient },
    { label: t("final"), score: review.finalCoefficient },
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {scores.map(({ label, score, context }) => (
          <div key={label} className="min-w-0 rounded-lg border bg-card p-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatNumber(score)}</dd>
            {context && <dd className="text-xs text-muted-foreground">{context}</dd>}
          </div>
        ))}
      </dl>
      {review.pmNotRated && <Badge variant="warning">{t("missingRatings")}</Badge>}
      {review.adjustReason && (
        <p className="text-sm break-words">{t("adjustmentReason", { reason: review.adjustReason })}{review.adjustedByName && ` · ${review.adjustedByName}`}</p>
      )}
      {review.lockedAt && (
        <p className="text-sm text-muted-foreground">{t("lockedAt", { date: formatDateTime(review.lockedAt) })}{review.lockedByName && ` · ${review.lockedByName}`}</p>
      )}
    </div>
  );
}

export function CountedTasks({ tasks }: { tasks: ReviewTask[] }) {
  const t = useTranslations("Kpi");
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("tasks")}</h2>
      {!tasks.length ? <p className="text-sm text-muted-foreground">{t("noTasks")}</p> : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("task")}</TableHead>
                <TableHead>{t("baselineMinutes")}</TableHead>
                <TableHead>{t("baselineDue")}</TableHead>
                <TableHead>{t("completed")}</TableHead>
                <TableHead>{t("result")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.taskId}>
                  <TableCell><div className="font-medium">{task.taskKey ?? "—"}</div>{task.projectCode}</TableCell>
                  <TableCell>
                    {formatNumber(task.baselineMinutes)}
                    {task.noBaseline && <div className="text-xs text-muted-foreground">{t("noBaseline")}</div>}
                  </TableCell>
                  <TableCell>{formatDate(task.baselineDueDate)}</TableCell>
                  <TableCell>{formatDateTime(task.completedAt)}</TableCell>
                  <TableCell><Badge variant={task.onTime ? "success" : "warning"}>{t(task.onTime ? "onTime" : "late")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

export function ProjectRatings({ ratings }: { ratings: ProjectRating[] }) {
  const t = useTranslations("Kpi");
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{t("projectRatings")}</h2>
      {!ratings.length ? <p className="text-sm text-muted-foreground">{t("noRatings")}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {ratings.map((rating) => (
            <li className="flex items-start justify-between gap-3 p-3" key={rating.projectId}>
              <div className="min-w-0 break-words">
                <p className="font-medium">{rating.projectName ?? rating.projectCode ?? "—"}</p>
                {rating.raterName && <p className="text-xs text-muted-foreground">{rating.raterName}</p>}
                {rating.note && <p className="mt-1 text-sm">{rating.note}</p>}
              </div>
              <Badge variant="outline">{t("ratingValue", { rating: rating.rating })}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
