"use client";

import { useState } from "react";
import { AlertTriangleIcon, BanIcon, ClockIcon, FlameIcon, UserXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMetrics, useOverview, useRisks } from "../hooks";
import { formatMinutes, percent } from "../rules";
import { BOARD_STATUSES, type Project, type Risk, type TaskEvent } from "../types";
import { PersonChip } from "./badges";
import { ReassignDialog } from "./reassign-dialog";

const STATUS_BAR = { TODO: "bg-muted-foreground/40", IN_PROGRESS: "bg-info", IN_REVIEW: "bg-warning", DONE: "bg-success" };

/** S3: 4 thẻ, cảnh báo từ dữ liệu nhân sự, tải theo người, metric, hoạt động. */
export function OverviewTab({ project, onOpenTask }: { project: Project; onOpenTask: (key: string) => void }) {
  const t = useTranslations("Projects");
  const overview = useOverview(project.id);
  const risks = useRisks(project.id, project.can.viewTasks);
  const metrics = useMetrics(project.id, project.can.viewTasks);
  const [reassigning, setReassigning] = useState<Risk | null>(null);

  if (overview.isPending) return <LoadingState />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  const o = overview.data;
  const total = BOARD_STATUSES.reduce((sum, status) => sum + (o.byStatus[status] ?? 0), 0);
  const maxLoad = Math.max(1, ...o.workload.map((row) => row.remainingMinutes));
  const maxDone = Math.max(1, ...(metrics.data?.throughput ?? []).map((week) => week.completed));

  const cards = [
    { label: t("cardUnassigned"), value: o.unassigned, icon: UserXIcon, tone: "text-muted-foreground" },
    { label: t("cardHigh"), value: o.highPriority, icon: FlameIcon, tone: "text-warning" },
    { label: t("cardOverdue"), value: o.overdue, icon: ClockIcon, tone: "text-destructive" },
    { label: t("cardBlocked"), value: o.blocked, icon: BanIcon, tone: "text-destructive" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </div>
              <Icon className={cn("size-6", tone)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {project.can.viewTasks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="text-warning size-4" /> {t("risksTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(risks.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noRisks")}</p>
            ) : (
              <ul className="divide-y">
                {risks.data!.map((risk) => (
                  <li key={risk.taskId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <button type="button" className="text-primary font-mono font-medium hover:underline" onClick={() => onOpenTask(risk.key)}>
                      {risk.key}
                    </button>
                    <span className="min-w-40 flex-1 truncate">{risk.title}</span>
                    <PersonChip person={risk.assignee} />
                    <span className="text-muted-foreground">{t("dueOn", { date: formatDate(risk.dueDate) })}</span>
                    <span className="flex flex-wrap gap-1">
                      {risk.codes.map((code) => (
                        <Badge key={code} variant={risk.high ? "destructive" : "warning"}>
                          {t(`risk.${code}`)}
                        </Badge>
                      ))}
                    </span>
                    {project.can.editAnyTask && (
                      <Button size="sm" variant="outline" onClick={() => setReassigning(risk)}>
                        {t("reassign")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("statusTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="bg-muted flex h-3 overflow-hidden rounded-full">
              {BOARD_STATUSES.map((status) => (
                <div key={status} className={STATUS_BAR[status]} style={{ width: `${percent(o.byStatus[status] ?? 0, total)}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {BOARD_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", STATUS_BAR[status])} />
                  <span className="text-muted-foreground">{t(`status.${status}`)}</span>
                  <span className="ml-auto font-medium tabular-nums">{o.byStatus[status] ?? 0}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("hoursSummary", {
                estimate: formatMinutes(o.estimateMinutes),
                logged: formatMinutes(o.loggedMinutes),
                remaining: formatMinutes(o.remainingMinutes),
              })}
            </p>
            {o.activeSprint && (
              <p className="text-sm">
                {t("activeSprint", {
                  name: o.activeSprint.name,
                  done: o.activeSprint.doneCount,
                  total: o.activeSprint.taskCount,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("workloadTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {o.workload.length === 0 && <p className="text-muted-foreground text-sm">{t("noWorkload")}</p>}
            {o.workload.map((row) => (
              <div key={row.person.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                <PersonChip person={row.person} />
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div className="bg-primary h-full" style={{ width: `${percent(row.remainingMinutes, maxLoad)}%` }} />
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {t("workloadRow", { tasks: row.openTasks, hours: formatMinutes(row.remainingMinutes) })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {project.can.viewTasks && metrics.data && (
        <Card>
          <CardHeader>
            <CardTitle>{t("metricsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label={t("metricCycle")} value={metrics.data.avgCycleHours == null ? "—" : t("hoursValue", { value: metrics.data.avgCycleHours.toFixed(1) })} />
              <Stat label={t("metricOnTime")} value={metrics.data.onTimeRate == null ? "—" : `${Math.round(metrics.data.onTimeRate * 100)}%`} />
              <Stat label={t("metricEstimate")} value={metrics.data.estimateErrorRate == null ? "—" : `${Math.round(metrics.data.estimateErrorRate * 100)}%`} />
              <Stat label={t("metricReassign")} value={String(metrics.data.reassignCount)} />
            </dl>
            <div>
              <p className="text-muted-foreground mb-2 text-sm">{t("metricThroughput")}</p>
              <div className="flex h-20 items-end gap-1">
                {metrics.data.throughput.map((week) => (
                  <div key={week.weekStart} className="bg-primary/70 flex-1 rounded-t" title={`${formatDate(week.weekStart)}: ${week.completed}`} style={{ height: `${Math.max(4, percent(week.completed, maxDone))}%` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {o.recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("activityTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {o.recentEvents.map((event) => (
                <EventLine key={event.id} event={event} showKey onOpenTask={onOpenTask} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {reassigning && <ReassignDialog taskId={reassigning.taskId} taskKey={reassigning.key} onClose={() => setReassigning(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Một dòng lịch sử, dùng chung cho tổng quan và panel việc. */
export function EventLine({ event, showKey, onOpenTask }: { event: TaskEvent; showKey?: boolean; onOpenTask?: (key: string) => void }) {
  const t = useTranslations("Projects");
  const status = (value: string | null) => (value && value in STATUS_LABEL_KEYS ? t(`status.${value as keyof typeof STATUS_LABEL_KEYS}`) : value ?? "—");
  const useStatus = event.kind === "STATUS_CHANGED";
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium">{event.actor?.fullName ?? t("system")}</span>
      <span className="text-muted-foreground">
        {t(`event.${event.kind}`, { from: useStatus ? status(event.from) : event.from ?? "—", to: useStatus ? status(event.to) : event.to ?? "—" })}
      </span>
      {showKey && (
        <button type="button" className="text-primary font-mono hover:underline" onClick={() => onOpenTask?.(event.taskKey)}>
          {event.taskKey}
        </button>
      )}
      <span className="text-muted-foreground ml-auto text-xs">{formatDateTime(event.occurredAt)}</span>
    </li>
  );
}

const STATUS_LABEL_KEYS = { TODO: 1, IN_PROGRESS: 1, IN_REVIEW: 1, DONE: 1, CANCELLED: 1 };
