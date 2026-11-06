"use client";

import Link from "next/link";
import { ListChecksIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, todayIsoDate } from "@/lib/format";
import { useMyWork } from "../hooks";
import { formatMinutes, groupMyWork, type WorkGroup } from "../rules";
import { PriorityIcon, TaskStatusBadge, TypeIcon } from "./badges";

const GROUPS: WorkGroup[] = ["overdue", "thisWeek", "later", "noDue"];

/** S11: việc được giao trên mọi dự án, kèm năng lực và tải tuần này. */
export function MyWorkPage() {
  const t = useTranslations("Projects");
  const work = useMyWork();

  return (
    <>
      <PageHeader
        title={t("myWorkTitle")}
        description={
          work.data
            ? t("myWorkLoad", { load: formatMinutes(work.data.weekLoadMinutes), capacity: formatMinutes(work.data.weekCapacityMinutes) })
            : t("myWorkDescription")
        }
      />
      {work.isPending ? (
        <LoadingState />
      ) : work.isError ? (
        <ErrorState error={work.error} onRetry={() => work.refetch()} />
      ) : work.data.tasks.length === 0 ? (
        <EmptyState icon={<ListChecksIcon />} title={t("myWorkEmpty")} />
      ) : (
        <div className="grid gap-4">
          {GROUPS.map((group) => {
            const tasks = groupMyWork(work.data.tasks, todayIsoDate())[group];
            if (tasks.length === 0) return null;
            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle>
                    {t(`workGroup.${group}`)} <Badge variant="secondary">{tasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {tasks.map(({ card, projectCode, projectName }) => (
                      <li key={card.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <TypeIcon type={card.type} />
                        <Link className="text-primary font-mono hover:underline" href={`/projects/${projectCode}?tab=board&task=${card.key}`}>
                          {card.key}
                        </Link>
                        <PriorityIcon priority={card.priority} />
                        <span className="min-w-40 flex-1 truncate">{card.title}</span>
                        <span className="text-muted-foreground">{projectName}</span>
                        <TaskStatusBadge status={card.status} />
                        <span className="text-muted-foreground w-12 text-right tabular-nums">{formatMinutes(card.remainingMinutes)}</span>
                        <span className={card.overdue ? "text-destructive" : "text-muted-foreground"}>{formatDate(card.dueDate)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
