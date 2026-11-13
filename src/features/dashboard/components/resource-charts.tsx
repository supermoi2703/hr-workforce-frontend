"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { heatLevel, SERIES_COLORS } from "../rules";
import type { Bucket, DepartmentLoad, ProjectLoad } from "../types";

/** Dòng tooltip "Tên ......... 59%" (shadcn mặc định không có đơn vị). */
export function percentRow(config: ChartConfig) {
  return function PercentRow(value: unknown, name: unknown) {
    const key = String(name);
    return (
      <div className="flex w-full items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: `var(--color-${key})` }} aria-hidden />
        <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">{String(value)}%</span>
      </div>
    );
  };
}

// ===== Đồng hồ utilization (meter nửa vòng) =====

const ARC_RADIUS = 80;
const ARC_LENGTH = Math.PI * ARC_RADIUS;

/**
 * Utilization trung bình: số lớn ở giữa, cung tô theo %, vạch trần. Thang kéo tới 125% trần để phần vượt trần nhìn thấy
 * được; vượt trần thì cung đổi màu cảnh báo và có nhãn chữ (không chỉ màu).
 */
export function UtilizationMeter({ percent, limit }: { percent: number; limit: number }) {
  const t = useTranslations("Dashboard.Resources");
  const scale = Math.max(limit * 1.25, percent);
  const filled = Math.min(percent / scale, 1);
  const limitAngle = Math.PI * (1 - limit / scale);
  const over = percent > limit;
  const tick = {
    x1: 100 + (ARC_RADIUS - 12) * Math.cos(limitAngle),
    y1: 96 - (ARC_RADIUS - 12) * Math.sin(limitAngle),
    x2: 100 + (ARC_RADIUS + 12) * Math.cos(limitAngle),
    y2: 96 - (ARC_RADIUS + 12) * Math.sin(limitAngle),
  };

  return (
    <figure className="grid justify-items-center gap-1">
      <svg viewBox="0 0 200 110" className="w-full max-w-56" role="img" aria-label={`${t("planned")}: ${percent}% · ${t("limit", { limit })}`}>
        <path
          d={`M ${100 - ARC_RADIUS} 96 A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${100 + ARC_RADIUS} 96`}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          className="stroke-chart-1/15"
        />
        <path
          d={`M ${100 - ARC_RADIUS} 96 A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${100 + ARC_RADIUS} 96`}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH * filled} ${ARC_LENGTH}`}
          className={over ? "stroke-destructive" : "stroke-chart-1"}
        />
        <line {...tick} strokeWidth={2} className="stroke-foreground/60" />
        <text x={100} y={86} textAnchor="middle" className="fill-foreground text-[40px] font-semibold">
          {percent}%
        </text>
      </svg>
      <figcaption className="text-center text-xs text-muted-foreground">
        {over ? <span className="font-medium text-destructive">{t("overLimit")} · </span> : null}
        {t("limit", { limit })}
      </figcaption>
    </figure>
  );
}

// ===== Heatmap phòng × tuần =====

const HEAT_CLASSES = {
  0: "bg-muted text-muted-foreground",
  1: "bg-chart-1/20 text-foreground",
  2: "bg-chart-1/45 text-foreground",
  3: "bg-chart-1/75 text-primary-foreground",
  4: "bg-chart-1 text-primary-foreground",
  over: "bg-destructive text-hero-foreground",
} as const;

/** Thang một màu, nhạt → đậm theo %; vượt trần là màu trạng thái. Mỗi ô có số và tooltip, nên không phụ thuộc màu. */
export function DepartmentHeatmap({
  departments,
  weeks,
  limit,
  noDepartment,
}: {
  departments: DepartmentLoad[];
  weeks: string[];
  limit: number;
  noDepartment: string;
}) {
  const t = useTranslations("Dashboard.Resources");
  const tCommon = useTranslations("Dashboard.Common");

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card pr-2 text-left font-medium text-muted-foreground">
                {t("department")}
              </th>
              {weeks.map((week) => (
                <th key={week} scope="col" className="min-w-11 px-0.5 text-center font-normal text-muted-foreground tabular-nums">
                  {formatDate(week).slice(0, 5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((row) => {
              const name = row.department?.name ?? noDepartment;
              return (
                <tr key={row.department?.id ?? "none"}>
                  <th scope="row" className="sticky left-0 z-10 max-w-40 truncate bg-card pr-2 text-left font-normal">
                    {name}
                  </th>
                  {row.weeks.map((percent, index) => {
                    const level = heatLevel(percent, limit);
                    const week = tCommon("weekOf", { date: formatDate(weeks[index]) });
                    const label =
                      percent === null
                        ? t("heatCellEmpty", { department: name, week })
                        : t("heatCell", { department: name, week, percent });
                    return (
                      <td key={weeks[index]} className="p-0">
                        <Tooltip>
                          <TooltipTrigger
                            render={<div />}
                            aria-label={label}
                            className={cn(
                              "flex h-8 items-center justify-center rounded tabular-nums",
                              level === null ? "border border-dashed text-muted-foreground" : HEAT_CLASSES[level],
                            )}
                          >
                            {percent === null ? "" : percent}
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {t("heatLegendLow")}
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span key={level} className={cn("h-3 w-5 rounded-sm", HEAT_CLASSES[level].split(" ")[0])} aria-hidden />
          ))}
          {t("heatLegendHigh", { limit })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-sm", HEAT_CLASSES.over.split(" ")[0])} aria-hidden />
          {t("heatLegendOver", { limit })}
        </span>
      </div>
    </div>
  );
}

// ===== Kế hoạch / thực tế theo phòng =====

/** Thanh ngang mỗi phòng. Chưa có số thực tế thì chỉ một chuỗi, không có chú thích (tiêu đề đã nói chuỗi đó là gì). */
export function DepartmentBars({ departments, noDepartment }: { departments: DepartmentLoad[]; noDepartment: string }) {
  const t = useTranslations("Dashboard.Resources");
  const hasActual = departments.some((row) => row.actualPercent !== null);
  const config = {
    planned: { label: t("series.planned"), color: "var(--chart-1)" },
    actual: { label: t("series.actual"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const data = departments.map((row) => ({
    name: row.department?.name ?? noDepartment,
    planned: row.plannedPercent,
    actual: row.actualPercent,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * (hasActual ? 52 : 40) + 40) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 40 }} barGap={2}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent formatter={percentRow(config)} />} />
        <Bar isAnimationActive={false} dataKey="planned" fill="var(--color-planned)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="planned" position="right" formatter={(value) => `${value}%`} className="fill-muted-foreground text-xs" />
        </Bar>
        {hasActual && <Bar isAnimationActive={false} dataKey="actual" fill="var(--color-actual)" radius={[0, 4, 4, 0]} maxBarSize={20} />}
        {hasActual && <ChartLegend content={<ChartLegendContent />} />}
      </BarChart>
    </ChartContainer>
  );
}

// ===== Phân bố utilization =====

/** Cột mỗi mức; mức trên 100% là trạng thái cảnh báo (màu đỏ, nhãn trục nói rõ). */
export function DistributionChart({ buckets }: { buckets: Bucket[] }) {
  const t = useTranslations("Dashboard.Resources");
  const config = { count: { label: t("columns.count"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = buckets.map((bucket) => ({ key: bucket.key, band: t(`bucket.${bucket.key}`), count: bucket.count }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 20, left: -16, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="band" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar isAnimationActive={false} dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.key === "over-100" ? "var(--destructive)" : "var(--color-count)"} />
          ))}
          <LabelList dataKey="count" position="top" className="fill-muted-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ===== Top dự án theo FTE =====

/** Thanh ngang mỗi dự án theo FTE; màu theo tính phí / không tính phí (cùng màu với donut thời gian), có chú thích. */
export function ProjectBars({ projects }: { projects: ProjectLoad[] }) {
  const t = useTranslations("Dashboard.Resources");
  const config = {
    billable: { label: t("split.billable"), color: SERIES_COLORS[0] },
    nonBillable: { label: t("split.nonBillable"), color: SERIES_COLORS[1] },
  } satisfies ChartConfig;
  const data = projects.map((project) => ({
    name: project.code,
    fullName: project.name,
    fte: project.fte,
    people: project.people,
    billable: project.billable,
  }));

  return (
    <div className="grid gap-2">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 34 + 24) }}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 48 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals />
          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.4 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                formatter={(value, _name, item) => `${t("fte")}: ${value} · ${item.payload.people}`}
              />
            }
          />
          <Bar isAnimationActive={false} dataKey="fte" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.billable ? "var(--color-billable)" : "var(--color-nonBillable)"} />
            ))}
            <LabelList dataKey="fte" position="right" className="fill-muted-foreground text-xs" />
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: SERIES_COLORS[0] }} aria-hidden />
          {t("split.billable")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: SERIES_COLORS[1] }} aria-hidden />
          {t("split.nonBillable")}
        </li>
      </ul>
    </div>
  );
}

