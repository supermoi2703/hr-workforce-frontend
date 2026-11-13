"use client";

import { useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDashboard } from "../hooks";
import { OTHER_COLOR, SERIES_COLORS, withSeriesColors } from "../rules";
import type { MyDashboard } from "../types";
import { BlockSection, Panel } from "./block-section";
import { DonutChart } from "./donut-chart";

/**
 * Tab Của tôi: phân tích cá nhân (thời gian theo dự án, phép năm, dự án đang tham gia). Các số trong ngày (giờ vào, đơn
 * chờ) nằm ở trang chủ.
 */
export function MyTab() {
  const t = useTranslations("Dashboard.Me");
  const query = useMyDashboard();

  return (
    <BlockSection title={t("title")}>
      {query.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data.leave ? (
        <EmptyState className="border border-dashed" title={t("noProfile")} />
      ) : (
        <MyView data={query.data} />
      )}
    </BlockSection>
  );
}

function MyView({ data }: { data: MyDashboard }) {
  const t = useTranslations("Dashboard.Me");
  const leave = data.leave!;
  // Màu theo thứ tự dự án trong ngày; phần còn trống màu xám.
  const time = withSeriesColors(
    data.projects.map((project) => ({ key: project.projectId, label: project.code, value: project.percent })),
  ).concat({ key: "free", label: t("free"), value: Math.max(0, 100 - data.allocatedPercent), color: OTHER_COLOR });
  const leaveParts = [
    { key: "used", label: t("used"), value: Number(leave.used), color: SERIES_COLORS[1] },
    { key: "available", label: t("available"), value: Math.max(0, Number(leave.available)), color: SERIES_COLORS[2] },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title={t("timeTitle")}>
        <DonutChart
          parts={time}
          centerValue={`${data.allocatedPercent}%`}
          centerLabel={t("timeCenter")}
          title={t("timeTitle")}
          format={(value) => `${value}%`}
        />
      </Panel>
      <Panel title={t("leaveTitle", { year: leave.year })}>
        <DonutChart
          parts={leaveParts}
          centerValue={String(leave.available)}
          centerLabel={t("leaveCenter")}
          title={t("leaveTitle", { year: leave.year })}
        />
      </Panel>
      <Panel title={t("projectsTitle")} description={data.projects.length ? undefined : t("noProject")}>
        {data.projects.length > 0 && (
          <ul className="grid min-w-0 grid-cols-1 gap-3">
            {data.projects.map((project, index) => (
              <li key={project.projectId} className="grid min-w-0 gap-1">
                <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{project.code}</span>
                    {project.name && <span className="text-muted-foreground"> · {project.name}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{t(`role.${project.role}`)}</Badge>
                    <span className="w-10 text-right tabular-nums">{project.percent}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.min(project.percent, 100)}%`, background: SERIES_COLORS[index % SERIES_COLORS.length] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
