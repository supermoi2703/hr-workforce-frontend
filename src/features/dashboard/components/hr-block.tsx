"use client";

import { useId } from "react";

import {
  BadgeCheckIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HourglassIcon,
  LogInIcon,
  LogOutIcon,
  RepeatIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_LOCALE, formatDate, formatNumber, formatTime } from "@/lib/format";
import type { HrQuery } from "../api";
import { useHrDashboard } from "../hooks";
import { change, lastTwo, SERIES_COLORS, withSeriesColors } from "../rules";
import type { AttendanceToday, ContractsExpiring, DepartmentCount, HrDashboard, MonthPoint, Slice } from "../types";
import { BlockSection, Panel } from "./block-section";
import { DonutChart } from "./donut-chart";
import { HeroRow, HeroStat } from "./hero-stat";
import { StatTile } from "./stat-tile";

/** Tab Nhân sự: HR văn phòng, HR toàn công ty, Admin. */
export function HrTab({ query }: { query: HrQuery }) {
  const t = useTranslations("Dashboard.Hr");
  const result = useHrDashboard(query);

  return (
    <BlockSection title={t("title")} description={t("description")}>
      {result.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : result.isError ? (
        <ErrorState error={result.error} onRetry={() => result.refetch()} />
      ) : (
        <HrView data={result.data} />
      )}
    </BlockSection>
  );
}

/** Hàng thẻ màu đặc của Nhân sự; tab Tổng quan dùng lại thẻ đầu. */
export function HrHeroes({ data, compact = false }: { data: HrDashboard; compact?: boolean }) {
  const t = useTranslations("Dashboard.Hr");
  const tHero = useTranslations("Dashboard.Hero");
  const { previous, current } = lastTwo(data.months);

  return (
    <>
      <HeroStat
        label={t("headcount")}
        value={formatNumber(data.headcount)}
        icon={UsersIcon}
        tone="people"
        change={change(previous?.headcount, data.headcount)}
        changeLabel={tHero("vsEndOfLastMonth")}
        detail={data.onboarding > 0 ? t("headcountDetail", { onboarding: data.onboarding }) : undefined}
        href={compact ? "/dashboard?tab=hr" : "/employees"}
      />
      {!compact && (
        <HeroStat
          label={t("hiresThisMonth")}
          value={current?.hires ?? 0}
          icon={LogInIcon}
          tone="leave"
          change={change(previous?.hires, current?.hires)}
          changeLabel={tHero("vsLastMonth")}
        />
      )}
      {!compact && (
        <HeroStat
          label={t("leaversThisMonth")}
          value={current?.terminations ?? 0}
          icon={LogOutIcon}
          tone="approval"
          change={change(previous?.terminations, current?.terminations)}
          changeLabel={tHero("vsLastMonth")}
          upIsGood={false}
        />
      )}
      {!compact && (
        <HeroStat
          label={t("turnover")}
          value={`${data.turnoverPercent}%`}
          icon={RepeatIcon}
          tone="time"
          detail={`${t("turnoverDetail")} · ${t("last12Months")}`}
        />
      )}
    </>
  );
}

const EMPLOYMENT_KEYS = ["FULL_TIME", "PROBATION", "INTERN", "CONTRACTOR"] as const;
const EMPLOYMENT_ICONS = {
  FULL_TIME: BadgeCheckIcon,
  PROBATION: HourglassIcon,
  INTERN: GraduationCapIcon,
  CONTRACTOR: HandshakeIcon,
} as const;
const TENURE_KEYS = ["LT_1", "1_3", "3_5", "GT_5"] as const;
const LEVEL_KEYS = ["INTERN_FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD_PRINCIPAL"] as const;

function count(slices: Slice[], key: string): number {
  return slices.find((slice) => slice.key === key)?.count ?? 0;
}

function HrView({ data }: { data: HrDashboard }) {
  const t = useTranslations("Dashboard.Hr");
  const tCommon = useTranslations("Dashboard.Common");

  const tenure = withSeriesColors(
    TENURE_KEYS.map((key) => ({ key, label: t(`tenure.${key}`), value: count(data.byTenure, key) })),
  );
  const level = withSeriesColors(
    LEVEL_KEYS.map((key) => ({ key, label: t(`level.${key}`), value: count(data.byLevel, key) })),
  );
  const offices = withSeriesColors(
    data.byOffice.map((slice) => ({ key: slice.key, label: slice.label ?? tCommon("other"), value: slice.count })),
  );

  return (
    <div className="grid gap-3">
      <HeroRow>
        <HrHeroes data={data} />
      </HeroRow>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title={t("totalTitle")}>
          <div className="grid gap-3">
            <span className="text-3xl font-semibold tracking-tight">{formatNumber(data.headcount)}</span>
            <ul className="grid gap-2 text-sm">
              {EMPLOYMENT_KEYS.map((key, index) => {
                const Icon = EMPLOYMENT_ICONS[key];
                return (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className="flex size-7 items-center justify-center rounded-md text-hero-foreground"
                      style={{ background: SERIES_COLORS[index] }}
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1">{t(`employmentType.${key}`)}</span>
                    <span className="font-medium tabular-nums">{count(data.byEmploymentType, key)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Panel>
        <Panel title={t("tenureTitle")}>
          <DonutChart parts={tenure} centerLabel={t("people")} title={t("tenureTitle")} />
        </Panel>
        <Panel title={t("levelTitle")}>
          <DonutChart parts={level} centerLabel={t("people")} title={t("levelTitle")} />
        </Panel>
        <Panel title={t("officeTitle")}>
          <DonutChart parts={offices} centerLabel={t("people")} title={t("officeTitle")} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("movementTitle")}>
          <MovementChart months={data.months} />
        </Panel>
        <Panel title={t("departmentsTitle")}>
          <HeadcountBars departments={data.departments} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {data.contracts && <ContractsPanel contracts={data.contracts} />}
        <div className="grid gap-3">
          {data.attendanceToday ? (
            <AttendancePanel attendance={data.attendanceToday} />
          ) : (
            <StatTile label={t("attendance")} icon={TimerIcon} tone="time" value="—" detail={t("attendanceOff")} />
          )}
          {data.payroll ? (
            <Panel title={t("payroll")}>
              <PayrollBars payroll={data.payroll} />
            </Panel>
          ) : (
            <StatTile label={t("payroll")} icon={WalletIcon} tone="money" value={null} pending="payroll" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Chấm công hôm nay theo nhóm, tính tới lúc tải trang. "Chưa chấm công" lúc đầu giờ gồm cả người chưa tới giờ vào làm,
 * nên ghi kèm giờ tính. Nhóm có chữ, không phụ thuộc màu.
 */
function AttendancePanel({ attendance }: { attendance: AttendanceToday }) {
  const t = useTranslations("Dashboard.Hr");
  const groups = [
    { key: "present", value: attendance.present, detail: attendance.late ? t("attendanceLate", { count: attendance.late }) : null },
    { key: "remote", value: attendance.remote, detail: null },
    { key: "notCheckedIn", value: attendance.notCheckedIn, detail: null },
    { key: "onLeave", value: attendance.onLeave, detail: null },
  ] as const;

  return (
    <Panel
      title={t("attendance")}
      description={t("attendanceAsOf", {
        expected: formatNumber(attendance.expected),
        time: formatTime(attendance.asOf),
      })}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {groups.map((group) => (
          <div key={group.key} className="grid content-start gap-0.5">
            <dt className="text-xs text-muted-foreground">{t(`attendanceGroups.${group.key}`)}</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(group.value)}</dd>
            {group.detail && <dd className="text-xs text-muted-foreground">{group.detail}</dd>}
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Số gọn cho trục tiền (1,2 Tr). Một formatter dùng chung, không tạo lại mỗi lần vẽ. */
const COMPACT = new Intl.NumberFormat(APP_LOCALE, { notation: "compact" });

/** "2026-11" → "11/26": gọn cho trục tháng. */
function shortMonth(month: string): string {
  const [year, value] = month.split("-");
  return `${value}/${year.slice(2)}`;
}

/** Hai vùng (vào, nghỉ) trên một trục, có chú thích. Tab Tổng quan dùng bản thấp hơn. */
export function MovementChart({ months, height = 256 }: { months: MonthPoint[]; height?: number }) {
  const t = useTranslations("Dashboard.Hr");
  const gradient = `movement-${useId().replace(/:/g, "")}`;
  const config = {
    hires: { label: t("series.hires"), color: SERIES_COLORS[0] },
    terminations: { label: t("series.terminations"), color: SERIES_COLORS[1] },
  } satisfies ChartConfig;
  const data = months.map((month) => ({ ...month, label: shortMonth(month.month) }));

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ top: 8, left: -20, right: 8 }}>
        <defs>
          {(["hires", "terminations"] as const).map((key) => (
            <linearGradient key={key} id={`${gradient}-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.25} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="hires"
          type="linear"
          stroke="var(--color-hires)"
          strokeWidth={2}
          fill={`url(#${gradient}-hires)`}
          isAnimationActive={false}
          activeDot={{ r: 4 }}
        />
        <Area
          dataKey="terminations"
          type="linear"
          stroke="var(--color-terminations)"
          strokeWidth={2}
          fill={`url(#${gradient}-terminations)`}
          isAnimationActive={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function HeadcountBars({ departments }: { departments: DepartmentCount[] }) {
  const t = useTranslations("Dashboard.Hr");
  const tCommon = useTranslations("Dashboard.Common");
  const config = { headcount: { label: t("series.headcount"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = departments.map((row) => ({ name: row.department?.name ?? tCommon("noDepartment"), headcount: row.headcount }));

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 36 + 32) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 40 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar isAnimationActive={false} dataKey="headcount" fill="var(--color-headcount)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="headcount" position="right" className="fill-muted-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function ContractsPanel({ contracts }: { contracts: ContractsExpiring }) {
  const t = useTranslations("Dashboard.Hr");
  const config = { count: { label: t("series.contracts"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = contracts.weeks.map((week) => ({ label: formatDate(week.weekStart).slice(0, 5), count: week.count }));

  return (
    <Panel
      title={t("contractsTitle")}
      description={
        contracts.within60Days
          ? t("contractsDescription", { within60: contracts.within60Days, within30: contracts.within30Days })
          : t("contractsEmpty")
      }
    >
      {contracts.within60Days > 0 && (
        <>
          <ChartContainer config={config} className="aspect-auto h-36 w-full" aria-label={t("contractsChart")}>
            <BarChart data={data} margin={{ top: 16, left: -24, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
              <Bar isAnimationActive={false} dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ChartContainer>
          <ul className="grid gap-2">
            {contracts.items.map((item) => (
              <li key={item.contractNumber} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <UserAvatar name={item.person.fullName} seed={item.person.employeeCode || item.person.id} size="sm" />
                  <span className="truncate">{item.person.fullName}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{item.contractNumber}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t("endsOn", { date: formatDate(item.endDate) })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function PayrollBars({ payroll }: { payroll: { month: string; amount: number }[] }) {
  const t = useTranslations("Dashboard.Hr");
  const config = { amount: { label: t("payroll"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = payroll.map((row) => ({ label: shortMonth(row.month), amount: row.amount }));
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 8, left: 8, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => COMPACT.format(value)} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar isAnimationActive={false} dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
