"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangleIcon, ArmchairIcon, DownloadIcon, GaugeIcon, HandCoinsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { saveFile } from "@/lib/download";
import { formatDate } from "@/lib/format";
import { downloadResourceExport, type ResourceQuery } from "../api";
import { billableSplit, change, OTHER_COLOR, withSeriesColors } from "../rules";
import { useResourceDashboard } from "../hooks";
import type { BenchPerson, OverloadedPerson, PersonRef, ResourceDashboard } from "../types";
import { BlockSection, Panel } from "./block-section";
import { DepartmentBars, DepartmentHeatmap, DistributionChart, ProjectBars, UtilizationMeter } from "./resource-charts";
import { AreaTile } from "./area-tile";
import { DonutChart } from "./donut-chart";
import { HeroRow, HeroStat } from "./hero-stat";
import { ExpandButton, useExpandable } from "./expandable";
import { StatTile } from "./stat-tile";

/** Tab Nguồn lực: utilization, bench, tính phí, quá tải, top dự án, xuất Excel. */
export function ResourcesTab({ query }: { query: ResourceQuery }) {
  const t = useTranslations("Dashboard.Resources");
  const tCommon = useTranslations("Dashboard.Common");
  const result = useResourceDashboard(query);
  const data = result.data;

  return (
    <BlockSection
      title={t("title")}
      description={
        data
          ? t("description", {
              from: formatDate(data.from),
              to: formatDate(data.to),
              people: tCommon("people", { count: data.summary.people }),
            })
          : undefined
      }
      actions={<ExportButton query={query} disabled={!data || data.summary.people === 0} />}
    >
      {result.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : result.isError ? (
        <ErrorState error={result.error} onRetry={() => result.refetch()} />
      ) : (
        <ResourceView data={result.data} />
      )}
    </BlockSection>
  );
}

/** Hàng thẻ màu đặc của Nguồn lực; tab Tổng quan dùng lại hai thẻ đầu. */
export function ResourceHeroes({ data, compact = false }: { data: ResourceDashboard; compact?: boolean }) {
  const t = useTranslations("Dashboard.Resources");
  const tHero = useTranslations("Dashboard.Hero");
  const now = data.trend[0];
  const end = data.trend.at(-1);
  // Khoảng xem bắt đầu từ tuần này nên chỉ so được tuần này với cuối kỳ.
  const plannedChange = data.trend.length > 1 ? change(now?.plannedPercent, end?.plannedPercent) : null;
  const benchChange = data.trend.length > 1 ? change(now?.benchCount, end?.benchCount) : null;

  return (
    <>
      <HeroStat
        label={t("plannedNow")}
        value={`${now?.plannedPercent ?? data.summary.plannedPercent}%`}
        icon={GaugeIcon}
        tone="project"
        change={plannedChange}
        changeUnit={tHero("points")}
        changeLabel={tHero("endOfPeriod")}
        detail={t("plannedHint")}
        href={compact ? "/dashboard?tab=resources" : undefined}
      />
      <HeroStat
        label={t("overloaded")}
        value={data.summary.overloadedCount}
        icon={AlertTriangleIcon}
        tone="approval"
        detail={t("overloadedDetail")}
        href={compact ? "/dashboard?tab=resources" : undefined}
      />
      {!compact && (
        <HeroStat
          label={t("bench")}
          value={now?.benchCount ?? data.summary.benchCount}
          icon={ArmchairIcon}
          tone="people"
          change={benchChange}
          changeLabel={tHero("endOfPeriod")}
          upIsGood={false}
          detail={t("benchDetail")}
        />
      )}
      {!compact && (
        <HeroStat
          label={t("billable")}
          value={`${data.summary.billablePercent}%`}
          icon={HandCoinsIcon}
          tone="leave"
          detail={t("billableDetail")}
        />
      )}
    </>
  );
}

function ResourceView({ data }: { data: ResourceDashboard }) {
  const t = useTranslations("Dashboard.Resources");
  const tCommon = useTranslations("Dashboard.Common");
  const { summary } = data;
  const noDepartment = tCommon("noDepartment");
  const split = billableSplit(summary.plannedPercent, summary.billablePercent);
  const timeParts = withSeriesColors([
    { key: "billable", label: t("split.billable"), value: split.billable },
    { key: "nonBillable", label: t("split.nonBillable"), value: split.nonBillable },
  ]).concat({ key: "free", label: t("split.free"), value: split.free, color: OTHER_COLOR });

  return (
    <div className="grid gap-3">
      <HeroRow>
        <ResourceHeroes data={data} />
      </HeroRow>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title={t("planned")} description={t("plannedHint")}>
          <UtilizationMeter percent={summary.plannedPercent} limit={data.limitPercent} />
        </Panel>
        <Panel title={t("timeTitle")}>
          <DonutChart
            parts={timeParts}
            centerValue={`${Math.min(summary.plannedPercent, 100)}%`}
            centerLabel={t("timeCenter")}
            title={t("timeTitle")}
            format={(value) => `${value}%`}
          />
        </Panel>
        <AreaTile
          label={t("trendTitle")}
          icon={GaugeIcon}
          tone="project"
          value={`${summary.plannedPercent}%`}
          detail={t("plannedHint")}
          points={data.trend.map((point) => ({ label: formatDate(point.weekStart).slice(0, 5), value: point.plannedPercent }))}
          color="var(--chart-1)"
          seriesLabel={t("series.planned")}
          unit="%"
        />
      </div>

      <Panel title={t("heatmapTitle")} description={t("heatmapDescription")}>
        <DepartmentHeatmap departments={data.departments} weeks={data.weeks} limit={data.limitPercent} noDepartment={noDepartment} />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("projectsTitle")} description={data.projects.length ? t("projectsDescription") : t("projectsEmpty")}>
          {data.projects.length > 0 && <ProjectBars projects={data.projects} />}
        </Panel>
        <Panel title={t("departmentsTitle")} description={t("departmentsDescription")}>
          <DepartmentBars departments={data.departments} noDepartment={noDepartment} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Panel title={t("distributionTitle")} description={t("distributionDescription")}>
          <DistributionChart buckets={data.distribution} />
        </Panel>
        <StatTile
          label={t("actual")}
          icon={GaugeIcon}
          tone="project"
          value={summary.actualPercent === null ? null : `${summary.actualPercent}%`}
          detail={t("actualHint")}
          pending="worklog"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <OverloadPanel people={data.overloaded} noDepartment={noDepartment} />
        <BenchPanel people={data.bench} noDepartment={noDepartment} />
      </div>
    </div>
  );
}

/** Tên, dòng phụ "mã NV · phòng": gộp phòng vào đây để bảng vừa nửa màn hình. */
function PersonCell({ person, noDepartment }: { person: PersonRef; noDepartment: string }) {
  return (
    <div className="flex min-w-36 items-center gap-2 lg:min-w-52">
      <UserAvatar name={person.fullName} seed={person.employeeCode || person.id} size="sm" />
      <div className="grid min-w-0">
        <span className="font-medium whitespace-normal">{person.fullName}</span>
        <span className="text-xs whitespace-normal text-muted-foreground">
          {person.employeeCode} · {person.department?.name ?? noDepartment}
        </span>
      </div>
    </div>
  );
}

function OverloadPanel({ people, noDepartment }: { people: OverloadedPerson[]; noDepartment: string }) {
  const t = useTranslations("Dashboard.Resources");
  const rows = useExpandable(people);

  return (
    <Panel title={t("overloadTitle")} description={people.length ? undefined : t("overloadEmpty")}>
      {people.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.person")}</TableHead>
                <TableHead className="text-right">{t("columns.maxDaily")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.firstOver")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("columns.weeksOver")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.shown.map((row) => (
                <TableRow key={row.person.id}>
                  <TableCell>
                    <PersonCell person={row.person} noDepartment={noDepartment} />
                  </TableCell>
                  <TableCell className="text-right">
                    {row.firstOverDay ? (
                      <Badge variant="destructive" className="tabular-nums">
                        {row.maxDailyPercent}%
                      </Badge>
                    ) : (
                      <span className="tabular-nums">{row.maxDailyPercent}%</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.firstOverDay ? formatDate(row.firstOverDay) : "—"}</TableCell>
                  <TableCell className="hidden text-right sm:table-cell">{t("weeksOverValue", { count: row.overCapacityWeeks.length })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ExpandButton list={rows} />
        </>
      )}
    </Panel>
  );
}

function BenchPanel({ people, noDepartment }: { people: BenchPerson[]; noDepartment: string }) {
  const t = useTranslations("Dashboard.Resources");
  const rows = useExpandable(people);

  return (
    <Panel title={t("benchTitle")} description={people.length ? undefined : t("benchEmpty")}>
      {people.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.person")}</TableHead>
                <TableHead>{t("columns.skills")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.shown.map((row) => (
                <TableRow key={row.person.id}>
                  <TableCell>
                    <PersonCell person={row.person} noDepartment={noDepartment} />
                  </TableCell>
                  <TableCell>
                    {row.skills.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("noSkills")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ExpandButton list={rows} />
        </>
      )}
    </Panel>
  );
}

function ExportButton({ query, disabled }: { query: ResourceQuery; disabled: boolean }) {
  const t = useTranslations("Dashboard.Resources");
  const errorMessage = useErrorMessage();
  const exporting = useMutation({
    mutationFn: () => downloadResourceExport(query),
    onSuccess: (file) => saveFile(file.blob, file.filename ?? `nguon-luc-${query.from}-${query.to}.xlsx`),
    onError: (error) => toast.error(t("exportFailed"), { description: errorMessage(error) }),
  });

  return (
    <Button variant="outline" disabled={disabled || exporting.isPending} onClick={() => exporting.mutate()}>
      <DownloadIcon data-icon="inline-start" />
      {exporting.isPending ? t("exporting") : t("export")}
    </Button>
  );
}

