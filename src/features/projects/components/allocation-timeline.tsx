"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dayOffsetPercent, monthTicks, timelineSpan, type MonthTick, type SegmentBar, type TimelineSpan } from "../allocation-rules";
import type { PersonAllocationItem } from "../work-types";
import { ProjectRoleBadge } from "./project-badges";

/** Dưới mức này (phần trăm bề rộng trục) nhãn % nằm ngoài thanh; khối Tổng bỏ chữ, chỉ còn thanh nhỏ. */
const LABEL_INSIDE_MIN = 12;
const TOTAL_TEXT_MIN = 9;
const TOTAL_DATE_MIN = 16;
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
  bars: SegmentBar[];
  items: PersonAllocationItem[];
};

/**
 * Lịch phân bổ dạng dòng thời gian: trục tháng, dòng Tổng (còn trống theo đoạn) và mỗi dự án một dòng. Mọi con số (%,
 * ngày) hiện sẵn trên màn hình, không phải di chuột.
 */
export function AllocationTimeline({ from, to, today, bars, items }: AllocationTimelineProps) {
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
        <Track ticks={ticks} todayAt={todayAt} className="h-20">
          {bars.map((bar) => (
            <TotalBlock key={bar.start} bar={bar} />
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
        <LegendItem swatch={<span className="size-3 rounded-sm border border-success/40 bg-success/15" />} label={t("legendFree")} />
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

/** Một đoạn của dòng Tổng: chữ to là còn trống, chữ nhỏ là đã duyệt / đang chờ, thanh mảnh dưới đáy cho thấy độ đầy. */
function TotalBlock({ bar }: { bar: SegmentBar }) {
  const t = useTranslations("Allocations.Schedule");
  const full = bar.freePercent === 0;
  const used =
    bar.pendingPercent > 0
      ? t("usedWithPending", { approved: bar.approvedPercent, pending: bar.pendingPercent })
      : t("usedApproved", { approved: bar.approvedPercent });
  const label = t("totalBlockLabel", {
    from: formatDate(bar.start),
    to: formatDate(bar.end),
    free: bar.freePercent,
    approved: bar.approvedPercent,
    pending: bar.pendingPercent,
  });
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "absolute inset-y-1 flex flex-col overflow-hidden rounded-md border px-2 pt-1 pb-2.5",
        full ? "border-destructive/30 bg-destructive/10" : "border-success/30 bg-success/10",
      )}
      style={{ left: `calc(${bar.leftPercent}% + 1px)`, width: `calc(${bar.widthPercent}% - 2px)` }}
    >
      {bar.widthPercent >= TOTAL_DATE_MIN && (
        <span className="hidden text-[10px] leading-3 text-muted-foreground tabular-nums sm:block">{formatDate(bar.start)}</span>
      )}
      {/* Màn hẹp chỉ còn con số trống; chi tiết ở danh sách "Theo đoạn ngày" bên dưới. */}
      <span className={cn("truncate text-sm leading-5 font-semibold tabular-nums sm:hidden", full ? "text-destructive" : "text-success")}>
        {bar.freePercent}%
      </span>
      {bar.widthPercent >= TOTAL_TEXT_MIN && (
        <>
          <span className={cn("hidden truncate text-sm leading-5 font-semibold sm:block", full ? "text-destructive" : "text-success")}>
            {full ? t("full") : t("freeShort", { percent: bar.freePercent })}
          </span>
          <span className="hidden truncate text-[11px] leading-4 text-muted-foreground sm:block">{used}</span>
        </>
      )}
      <span className="absolute inset-x-2 bottom-1 flex h-1 overflow-hidden rounded-full bg-success/25" aria-hidden>
        <span className="bg-primary" style={{ width: `${bar.approvedPercent}%` }} />
        <span className="bg-pending" style={{ width: `${bar.pendingPercent}%` }} />
      </span>
    </div>
  );
}

type ProjectRowProps = { item: PersonAllocationItem; span: TimelineSpan | null; ticks: MonthTick[]; todayAt: number | null };

function ProjectRow({ item, span, ticks, todayAt }: ProjectRowProps) {
  const t = useTranslations("Allocations.Schedule");
  const pending = item.status === "PENDING";
  const period = `${formatDate(item.fromDate)} → ${item.toDate ? formatDate(item.toDate) : t("noEnd")}`;
  const barText = pending ? t("barPending", { percent: item.percent }) : `${item.percent}%`;
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
              aria-label={t("barLabel", { project: item.projectCode, percent: item.percent, period, status: pending ? t("statusPending") : t("statusApproved") })}
              className={cn(
                "absolute inset-y-1 flex items-center justify-between gap-1 overflow-hidden rounded-md px-1.5 text-xs font-semibold tabular-nums",
                pending ? "border border-pending text-pending-foreground" : "bg-primary text-primary-foreground",
                span.startsBefore && "rounded-l-none",
                span.endsAfter && "rounded-r-none",
              )}
              style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%`, ...(pending ? PENDING_STRIPES : undefined) }}
            >
              {span.startsBefore ? <ChevronLeftIcon className="size-3.5 shrink-0 opacity-80" aria-hidden /> : <span />}
              {inside && <span className={cn("truncate", pending && "rounded bg-pending px-1.5")}>{barText}</span>}
              {span.endsAfter ? <ChevronRightIcon className="size-3.5 shrink-0 opacity-80" aria-hidden /> : <span />}
            </div>
            {!inside && (
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
