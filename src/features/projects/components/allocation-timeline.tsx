"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dayOffsetPercent, monthTicks, timelineSpan, type MonthTick, type TimelineSpan, type WeekBar } from "../allocation-rules";
import { hoursText } from "../work-rules";
import type { PersonAllocationItem, WorkloadZone } from "../work-types";
import { ProjectRoleBadge } from "./project-badges";

/** Dưới mức này (phần trăm bề rộng trục) nhãn nằm ngoài thanh; ô tuần chỉ còn %, rồi chỉ còn màu. */
const LABEL_INSIDE_MIN = 12;
const WEEK_HOURS_MIN = 7;
const WEEK_PERCENT_MIN = 3.5;

/** Màu ô tuần theo vùng tải (xanh / vàng / đỏ). */
const ZONE_BLOCK: Record<WorkloadZone, string> = {
  GREEN: "border-success/30 bg-success/10 text-success",
  YELLOW: "border-warning/40 bg-warning/15 text-warning",
  RED: "border-destructive/30 bg-destructive/10 text-destructive",
};
/** Số nhãn tháng tối đa trên trục: màn rộng / màn hẹp. Đường kẻ tháng vẫn vẽ đủ. */
const MAX_TICK_LABELS = 9;
const MAX_TICK_LABELS_NARROW = 4;
/** Vạch hôm nay sát mép trục: nhãn canh vào trong để không tràn ra ngoài. */
const TODAY_EDGE = 6;

/** Sọc chéo cho phần đang chờ duyệt: khác hẳn phần đã duyệt kể cả khi in đen trắng. */
export const PENDING_STRIPES: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--pending) 0 7px, color-mix(in oklch, var(--pending) 60%, transparent) 7px 14px)",
};

type AllocationTimelineProps = {
  from: string;
  to: string;
  today: string;
  weeks: WeekBar[];
  items: PersonAllocationItem[];
};

/**
 * Lịch phân bổ dạng dòng thời gian: trục tháng, dòng tải theo tuần (giờ task ÷ năng lực, tô theo vùng; workload bước 3) và
 * mỗi dự án một dòng (khoảng tham gia, không còn %). Mọi con số hiện sẵn trên màn hình, không phải di chuột.
 */
export function AllocationTimeline({ from, to, today, weeks, items }: AllocationTimelineProps) {
  const t = useTranslations("Allocations.Schedule");
  const ticks = monthTicks(from, to);
  const todayAt = dayOffsetPercent(today, from, to);

  return (
    <div className="grid gap-3">
      <TimelineRow label={null}>
        <TimelineAxis ticks={ticks} todayAt={todayAt} />
      </TimelineRow>

      <TimelineRow
        label={
          <>
            <p className="font-medium">{t("total")}</p>
            <p className="text-xs text-muted-foreground">{t("totalHint")}</p>
          </>
        }
      >
        <Track ticks={ticks} todayAt={todayAt} className="h-14">
          {weeks.map((week) => (
            <WeekBlock key={week.weekStart} week={week} />
          ))}
        </Track>
      </TimelineRow>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        items.map((item) => (
          <ProjectRow
            key={`${item.projectId}-${item.status}-${item.fromDate}-${item.requestId ?? ""}`}
            item={item}
            span={timelineSpan(item.fromDate, item.toDate, from, to)}
            ticks={ticks}
            todayAt={todayAt}
          />
        ))
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-xs text-muted-foreground">
        <LegendItem swatch={<span className="size-3 rounded-sm bg-primary" />} label={t("legendApproved")} />
        <LegendItem swatch={<span className="size-3 rounded-sm border border-pending" style={PENDING_STRIPES} />} label={t("legendHeld")} />
        {(["GREEN", "YELLOW", "RED"] as const).map((zone) => (
          <LegendItem key={zone} swatch={<span className={cn("size-3 rounded-sm border", ZONE_BLOCK[zone])} />} label={t(`legendZone.${zone}`)} />
        ))}
        {todayAt !== null && <LegendItem swatch={<span className="h-3 w-0.5 bg-destructive/70" />} label={t("today")} />}
      </ul>
    </div>
  );
}

/** Cột trái (tên dòng) + đường ray. Màn hẹp: tên xếp trên ray, ray rộng hết khung. */
function TimelineRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-center">
      {label === null ? <div className="hidden sm:block" /> : <div className="min-w-0">{label}</div>}
      {children}
    </div>
  );
}

function TimelineAxis({ ticks, todayAt }: { ticks: MonthTick[]; todayAt: number | null }) {
  const t = useTranslations("Allocations.Schedule");
  const step = Math.max(1, Math.ceil(ticks.length / MAX_TICK_LABELS));
  const narrowStep = Math.max(1, Math.ceil(ticks.length / MAX_TICK_LABELS_NARROW));
  return (
    <div className="relative h-5 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
      {ticks.map((tick, index) =>
        index % step === 0 ? (
          <span
            key={tick.date}
            className={cn("absolute top-0 border-l pl-1 leading-5 whitespace-nowrap", index % narrowStep !== 0 && "hidden sm:block")}
            style={{ left: `${tick.leftPercent}%` }}
          >
            {t("monthTick", { month: tick.month, year: tick.year, withYear: String(tick.month === 1 || index === 0) })}
          </span>
        ) : null,
      )}
      {todayAt !== null && (
        <span
          className={cn(
            "absolute -top-0.5 hidden rounded bg-destructive px-1 text-[10px] leading-4 font-medium text-white sm:block",
            todayAt < TODAY_EDGE ? "" : todayAt > 100 - TODAY_EDGE ? "-translate-x-full" : "-translate-x-1/2",
          )}
          style={{ left: `${todayAt}%` }}
        >
          {t("today")}
        </span>
      )}
    </div>
  );
}

/** Ray thời gian: nền nhạt, đường kẻ đầu tháng, vạch hôm nay; con đặt tuyệt đối theo % trục. */
function Track({ ticks, todayAt, className, children }: { ticks: MonthTick[]; todayAt: number | null; className: string; children: ReactNode }) {
  return (
    <div className={cn("relative rounded-md bg-muted/50", className)}>
      {ticks.map((tick) => (
        <span key={tick.date} className="absolute inset-y-0 w-px bg-border" style={{ left: `${tick.leftPercent}%` }} aria-hidden />
      ))}
      {children}
      {todayAt !== null && (
        <span className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-destructive/70" style={{ left: `${todayAt}%` }} aria-hidden />
      )}
    </div>
  );
}

/** Một tuần của dòng tải: giờ task / năng lực, tô theo vùng; hẹp thì chỉ còn %, rồi chỉ còn màu. */
function WeekBlock({ week }: { week: WeekBar }) {
  const t = useTranslations("Allocations.Schedule");
  const percent = week.percent === null ? "—" : `${week.percent}%`;
  const label = t("weekLabel", {
    week: formatDate(week.weekStart),
    load: hoursText(week.loadMinutes),
    capacity: hoursText(week.capacityMinutes),
    percent,
    zone: t(`legendZone.${week.zone}`),
  });
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={cn("absolute inset-y-1 flex flex-col justify-center overflow-hidden rounded-md border px-1.5", ZONE_BLOCK[week.zone])}
      style={{ left: `calc(${week.leftPercent}% + 1px)`, width: `calc(${week.widthPercent}% - 2px)` }}
    >
      {week.widthPercent >= WEEK_PERCENT_MIN && (
        <span className="truncate text-xs leading-4 font-semibold tabular-nums">{percent}</span>
      )}
      {week.widthPercent >= WEEK_HOURS_MIN && (
        <span className="truncate text-[10px] leading-3 text-muted-foreground tabular-nums">
          {t("weekHours", { load: hoursText(week.loadMinutes), capacity: hoursText(week.capacityMinutes) })}
        </span>
      )}
    </div>
  );
}

type ProjectRowProps = { item: PersonAllocationItem; span: TimelineSpan | null; ticks: MonthTick[]; todayAt: number | null };

function ProjectRow({ item, span, ticks, todayAt }: ProjectRowProps) {
  const t = useTranslations("Allocations.Schedule");
  const pending = item.status === "PENDING";
  const period = `${formatDate(item.fromDate)} → ${item.toDate ? formatDate(item.toDate) : t("noEnd")}`;
  const barText = pending ? t("statusPending") : null;
  const inside = span !== null && span.widthPercent >= LABEL_INSIDE_MIN;

  return (
    <TimelineRow
      label={
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/projects/${encodeURIComponent(item.projectCode)}`} className="font-mono text-sm font-medium text-primary hover:underline">
              {item.projectCode}
            </Link>
            <ProjectRoleBadge role={item.role} />
            {pending && <PendingBadge label={t("statusPending")} />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.projectName}
            {item.projectClosed && <> · {t("closed")}</>}
          </p>
          <p className="text-xs tabular-nums">
            {period}
            {item.approvalRequestId && (
              <>
                {" · "}
                <Link href={`/approvals/${encodeURIComponent(item.approvalRequestId)}`} className="text-primary hover:underline">
                  {t("openApproval")}
                </Link>
              </>
            )}
          </p>
        </>
      }
    >
      <Track ticks={ticks} todayAt={todayAt} className="h-9">
        {span && (
          <>
            <div
              role="img"
              aria-label={t("barLabel", { project: item.projectCode, period, status: pending ? t("statusPending") : t("statusApproved") })}
              className={cn(
                "absolute inset-y-1 flex items-center justify-between gap-1 overflow-hidden rounded-md px-1.5 text-xs font-semibold tabular-nums",
                pending ? "border border-pending text-pending-foreground" : "bg-primary text-primary-foreground",
                span.startsBefore && "rounded-l-none",
                span.endsAfter && "rounded-r-none",
              )}
              style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%`, ...(pending ? PENDING_STRIPES : undefined) }}
            >
              {span.startsBefore ? <ChevronLeftIcon className="size-3.5 shrink-0 opacity-80" aria-hidden /> : <span />}
              {inside && barText && <span className="truncate rounded bg-pending px-1.5">{barText}</span>}
              {span.endsAfter ? <ChevronRightIcon className="size-3.5 shrink-0 opacity-80" aria-hidden /> : <span />}
            </div>
            {!inside && barText && (
              <span
                className="absolute top-1/2 -translate-y-1/2 pl-1.5 text-xs font-semibold whitespace-nowrap tabular-nums"
                style={span.leftPercent + span.widthPercent > 80 ? { right: `${100 - span.leftPercent}%`, paddingRight: 6 } : { left: `${span.leftPercent + span.widthPercent}%` }}
                aria-hidden
              >
                {barText}
              </span>
            )}
          </>
        )}
      </Track>
    </TimelineRow>
  );
}

/** Badge "Chờ duyệt" cùng tông với thanh đang chờ (vàng cam), thay cho tông warning đậm. */
export function PendingBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="border-pending bg-pending/25 text-pending-foreground dark:text-pending">
      {label}
    </Badge>
  );
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="flex items-center" aria-hidden>
        {swatch}
      </span>
      {label}
    </li>
  );
}
