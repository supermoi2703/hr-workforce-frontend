"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dayOffsetPercent, timelineSpan } from "../allocation-rules";
import { hoursText } from "../work-rules";
import type { TimelineSprint, TimelineTask, WorkloadZone } from "../work-types";
import { BAR_CLASS, barLook, barStyle, PHASE_COLOR } from "./timeline-colors";
import {
  barSpan,
  columns,
  lateDays,
  monthBands,
  overdueSpan,
  ZOOMS,
  type Column,
  type TimelineWindow,
  type Zoom,
} from "./timeline-scale";
import type { LoadCell } from "./load-cells";

// Bộ vẽ dùng chung của Gantt dự án và lịch tải (workload bước 5). Cột tên dính trái khi cuộn ngang, đường kẻ theo cột,
// vạch hôm nay; thanh việc tô theo giai đoạn, độ đậm theo trạng thái.

/** Bề rộng cột tên: hẹp hơn trên màn điện thoại. */
const LABEL_WIDTH = "clamp(10rem, 28vw, 18rem)";
/** Dưới bề rộng này (% trục) nhãn đặt ngoài thanh. */
const LABEL_INSIDE_MIN = 9;

const ZONE_SOFT: Record<WorkloadZone, string> = {
  GREEN: "bg-success/12 text-success",
  YELLOW: "bg-warning/12 text-warning",
  RED: "bg-destructive/12 text-destructive",
};
const ZONE_DOT: Record<WorkloadZone, string> = { GREEN: "bg-success", YELLOW: "bg-warning", RED: "bg-destructive" };

type FrameProps = {
  window: TimelineWindow;
  zoom: Zoom;
  today: string;
  /** Chữ trên cột tên ở đầu bảng. */
  corner: ReactNode;
  sprints?: TimelineSprint[];
  /** Dải nghỉ (ngày nghỉ cả ngày) vẽ sọc mờ suốt chiều cao. */
  shadedDays?: string[];
  children: ReactNode;
};

/**
 * Khung dòng thời gian: đầu bảng (tháng, sprint, cột tuần / ngày, nhãn hôm nay), đường kẻ dọc và vạch hôm nay phủ suốt các
 * hàng con. Cuộn ngang trong khung; cột tên dính trái. Lần đầu mở thì cuộn tới hôm nay.
 */
export function TimelineFrame({ window, zoom, today, corner, sprints = [], shadedDays = [], children }: FrameProps) {
  const t = useTranslations("Timeline");
  const scroller = useRef<HTMLDivElement>(null);
  const cols = columns(window, zoom);
  const bands = monthBands(window);
  const todayAt = dayOffsetPercent(today, window.from, window.to);

  useEffect(() => {
    const box = scroller.current;
    if (!box || todayAt === null || box.scrollWidth <= box.clientWidth) return;
    const inner = box.scrollWidth;
    box.scrollLeft = Math.max(0, (inner * todayAt) / 100 - box.clientWidth / 2);
  }, [todayAt]);

  return (
    <div ref={scroller} className="overflow-x-auto" style={{ "--label": LABEL_WIDTH } as CSSProperties}>
      <div className="relative min-w-[60rem]">
        <div className="grid grid-cols-[var(--label)_minmax(0,1fr)] border-b bg-muted/40">
          <div className="sticky left-0 z-20 flex items-end border-r bg-muted px-4 pb-2 text-xs font-medium text-muted-foreground">
            {corner}
          </div>
          <div className="relative" aria-hidden>
            <div className="relative h-7">
              {bands.map((band) => (
                <span
                  key={band.key}
                  className="absolute inset-y-0 truncate border-l px-2 pt-1.5 text-xs font-semibold text-foreground"
                  style={{ left: `${band.leftPercent}%`, width: `${band.widthPercent}%` }}
                >
                  {t("month", { month: band.month, year: band.year })}
                </span>
              ))}
            </div>
            {sprints.length > 0 && (
              <div className="relative h-6">
                {sprints.map((sprint, index) => {
                  const span = timelineSpan(sprint.startDate, sprint.endDate, window.from, window.to);
                  return span ? (
                    <span
                      key={sprint.id}
                      className="absolute inset-y-0.5 px-0.5"
                      style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
                    >
                      <span
                        className={cn(
                          "flex h-full items-center truncate rounded-md px-2 text-[11px] font-semibold",
                          index % 2 === 0
                            ? "bg-[color-mix(in_oklch,var(--chart-1)_14%,var(--card))] text-[color-mix(in_oklch,var(--chart-1)_75%,var(--foreground))]"
                            : "bg-[color-mix(in_oklch,var(--chart-5)_14%,var(--card))] text-[color-mix(in_oklch,var(--chart-5)_75%,var(--foreground))]",
                        )}
                      >
                        {sprint.name}
                      </span>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="relative h-6">
              {cols.map((column) => (
                <ColumnLabel key={column.date} column={column} zoom={zoom} today={today} />
              ))}
            </div>
            <div className="relative h-5">
              {todayAt !== null && (
                <span
                  className="absolute top-0 z-30 -translate-x-1/2 rounded-full bg-primary px-2 py-px text-[10px] font-semibold whitespace-nowrap text-primary-foreground shadow-sm"
                  style={{ left: `${todayAt}%` }}
                >
                  {t("today")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 left-[var(--label)]" aria-hidden>
            {cols.map((column) =>
              column.weekend ? (
                <span
                  key={`w${column.date}`}
                  className="absolute inset-y-0 bg-muted/60"
                  style={{ left: `${column.leftPercent}%`, width: `${column.widthPercent}%` }}
                />
              ) : null,
            )}
            {shadedDays.map((day) => {
              const span = timelineSpan(day, day, window.from, window.to);
              return span ? (
                <span
                  key={`l${day}`}
                  className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--muted-foreground)_14%,transparent)_0_4px,transparent_4px_8px)]"
                  style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
                />
              ) : null;
            })}
            {cols.map((column) => (
              <span key={column.date} className="absolute inset-y-0 w-px bg-border/70" style={{ left: `${column.leftPercent}%` }} />
            ))}
            {todayAt !== null && (
              <span className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-primary/60" style={{ left: `${todayAt}%` }} />
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ColumnLabel({ column, zoom, today }: { column: Column; zoom: Zoom; today: string }) {
  const t = useTranslations("Timeline");
  const [, month, day] = column.date.split("-").map(Number);
  const isToday = zoom === "week" && column.date === today;
  return (
    <span
      className={cn(
        "absolute inset-y-0 truncate border-l px-1.5 pt-1 text-[11px] tabular-nums",
        column.weekend ? "text-muted-foreground/70" : "text-muted-foreground",
        isToday && "font-semibold text-primary",
        zoom === "quarter" && "px-1 text-[10px]",
      )}
      style={{ left: `${column.leftPercent}%`, width: `${column.widthPercent}%` }}
    >
      {zoom === "week" ? t("dayLabel", { day, weekday: new Date(`${column.date}T00:00:00Z`).getUTCDay() }) : `${day}/${month}`}
    </span>
  );
}

/** Một hàng: ô tên dính trái + đường ray đặt con tuyệt đối theo % trục. */
export function TimelineRow({
  label,
  children,
  className,
  trackClassName,
  group = false,
}: {
  label: ReactNode;
  children?: ReactNode;
  className?: string;
  trackClassName?: string;
  group?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[var(--label)_minmax(0,1fr)] border-b",
        group ? "border-t bg-muted/30" : "border-border/60 transition-colors hover:bg-accent/40",
        className,
      )}
    >
      <div className={cn("sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r px-4", group ? "bg-muted py-2.5" : "bg-card py-1")}>
        {label}
      </div>
      <div className={cn("relative", trackClassName ?? "h-10")}>{children}</div>
    </div>
  );
}

/** Avatar chữ tắt dùng chung (`UserAvatar`): mỗi người một màu cố định theo `seed`. */
export function PersonAvatar({ name, seed, className }: { name: string; seed: string; className?: string }) {
  return <UserAvatar name={name} seed={seed} className={cn("shrink-0", className)} />;
}

/** Chip vùng tải: chấm + tên vùng. */
export function ZoneChip({ zone, className }: { zone: WorkloadZone; className?: string }) {
  const t = useTranslations("Timeline");
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", ZONE_SOFT[zone], className)}>
      <span className={cn("size-1.5 rounded-full", ZONE_DOT[zone])} aria-hidden />
      {t(`zone.${zone}`)}
    </span>
  );
}

/** Thanh mảnh tóm tắt khoảng ngày của một nhóm (người, dự án). */
export function SummaryBar({ start, end, window }: { start: string; end: string; window: TimelineWindow }) {
  const span = timelineSpan(start, end, window.from, window.to);
  return span ? (
    <span
      className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/30"
      style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
      aria-hidden
    />
  ) : null;
}

type TaskBarProps = {
  task: TimelineTask;
  window: TimelineWindow;
  today: string;
  /** Tên người làm cho thẻ chi tiết; null = chưa giao. */
  assigneeName?: string | null;
  onOpen?: (key: string) => void;
};

/**
 * Thanh một việc: màu theo giai đoạn, độ đậm theo trạng thái, viền đứt khi ngày lấy theo sprint, đuôi sọc đỏ khi quá hạn
 * tới hôm nay. Rê chuột hiện thẻ chi tiết; bấm mở sheet việc. Là nút thật để dùng bàn phím được.
 */
export function TaskBar({ task, window, today, assigneeName, onOpen }: TaskBarProps) {
  const t = useTranslations("Timeline");
  const tStatus = useTranslations("ProjectWork.status");
  const tPhase = useTranslations("ProjectWork.phase");
  const span = barSpan(task.start, task.end, window);
  const tail = task.overdue ? overdueSpan(task.end, today, window) : null;
  if (!span && !tail) return null;

  const look = barLook(task.status);
  const late = task.overdue ? lateDays(task.end, today) : 0;
  const progress =
    task.estimateMinutes && task.estimateMinutes > 0 ? Math.min(100, Math.round((task.loggedMinutes / task.estimateMinutes) * 100)) : null;
  const text = look === "doing" && progress !== null ? t("barProgress", { key: task.key, percent: progress }) : task.key;
  const inside = span !== null && span.widthPercent >= LABEL_INSIDE_MIN;
  const period = `${task.start ? formatDate(task.start) : "…"} – ${formatDate(task.end)}`;
  const aria = t("barAria", {
    key: task.key,
    title: task.title,
    status: tStatus(task.status),
    period,
    late: String(late),
  });
  const after = Math.max(span ? span.leftPercent + span.widthPercent : 0, tail ? tail.leftPercent + tail.widthPercent : 0);

  return (
    <>
      {span && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={aria}
                onClick={() => onOpen?.(task.key)}
                className={cn(
                  "absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[11px] font-semibold whitespace-nowrap transition-[left,width,filter] duration-150 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                  BAR_CLASS[look],
                  (task.startFromSprint || task.endFromSprint) && look !== "doing" && "border-dashed",
                  span.startsBefore && "rounded-l-none",
                  span.endsAfter && "rounded-r-none",
                  tail && "rounded-r-none",
                )}
                style={{ ...barStyle(task.workPhase), left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
              />
            }
          >
            {span.startsBefore && <ChevronLeftIcon className="-ml-1 size-3 shrink-0 opacity-80" aria-hidden />}
            {inside && <span className="truncate">{look === "done" ? `✓ ${text}` : text}</span>}
            {look === "doing" && progress !== null && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25" aria-hidden>
                <span className="block h-full bg-white/90" style={{ width: `${progress}%` }} />
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="block w-72 max-w-none rounded-xl bg-popover p-3.5 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 [&>[data-side]]:hidden"
          >
            <TaskCard task={task} assigneeName={assigneeName} period={period} progress={progress} late={late} tStatus={tStatus} tPhase={tPhase} />
          </TooltipContent>
        </Tooltip>
      )}
      {tail && (
        <span
          aria-hidden
          className="absolute top-1/2 h-6 -translate-y-1/2 rounded-r-md border border-l-0 border-destructive bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--destructive)_28%,var(--card))_0_5px,color-mix(in_oklch,var(--destructive)_8%,var(--card))_5px_10px)]"
          style={{ left: `${tail.leftPercent}%`, width: `${tail.widthPercent}%` }}
        />
      )}
      {(late > 0 || !inside) && after < 92 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
          style={{ left: `${after}%` }}
        >
          {!inside && <span className="text-muted-foreground">{task.key}</span>}
          {late > 0 && <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-destructive">{t("late", { days: late })}</span>}
        </span>
      )}
    </>
  );
}

function TaskCard({
  task,
  assigneeName,
  period,
  progress,
  late,
  tStatus,
  tPhase,
}: {
  task: TimelineTask;
  assigneeName?: string | null;
  period: string;
  progress: number | null;
  late: number;
  tStatus: (key: TimelineTask["status"]) => string;
  tPhase: (key: NonNullable<TimelineTask["workPhase"]>) => string;
}) {
  const t = useTranslations("Timeline");
  return (
    <div className="grid gap-2.5" style={barStyle(task.workPhase)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {task.parentKey ? `${task.parentKey} › ` : ""}
          {task.key}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", BAR_CLASS[barLook(task.status)], "border-0")}>
          {tStatus(task.status)}
        </span>
      </div>
      <p className="leading-snug font-semibold">{task.title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {assigneeName !== undefined && (
          <>
            <dt className="text-muted-foreground">{t("cardAssignee")}</dt>
            <dd>{assigneeName ?? t("unassigned")}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("cardPeriod")}</dt>
        <dd className="tabular-nums">
          {period}
          {(task.startFromSprint || task.endFromSprint) && <span className="text-muted-foreground"> · {t("fromSprint")}</span>}
        </dd>
        <dt className="text-muted-foreground">{t("cardLogged")}</dt>
        <dd className="tabular-nums">
          {task.estimateMinutes
            ? t("loggedOf", { logged: hoursText(task.loggedMinutes), estimate: hoursText(task.estimateMinutes) })
            : t("loggedOnly", { logged: hoursText(task.loggedMinutes) })}
        </dd>
        {task.workPhase && (
          <>
            <dt className="text-muted-foreground">{t("cardCategory")}</dt>
            <dd className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--bar)]" aria-hidden />
              {task.workCategoryName ?? tPhase(task.workPhase)}
            </dd>
          </>
        )}
      </dl>
      {progress !== null && (
        <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-[var(--bar)]" style={{ width: `${progress}%` }} />
        </span>
      )}
      {late > 0 && <p className="text-xs font-semibold text-destructive">{t("late", { days: late })}</p>}
      <p className="text-xs text-muted-foreground">{t("clickToOpen")}</p>
    </div>
  );
}

/** Nút ‹ Hôm nay ›, khoảng đang xem và nút chọn mức phóng to. */
export function TimelineToolbar({
  window,
  zoom,
  onZoom,
  onShift,
  onToday,
  children,
}: {
  window: TimelineWindow;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  onShift: (direction: -1 | 1) => void;
  onToday: () => void;
  children?: ReactNode;
}) {
  const t = useTranslations("Timeline");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label={t("previous")} onClick={() => onShift(-1)}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          {t("today")}
        </Button>
        <Button variant="outline" size="icon-sm" aria-label={t("next")} onClick={() => onShift(1)}>
          <ChevronRightIcon />
        </Button>
        <span className="ml-1 text-sm font-semibold tabular-nums">
          {formatDate(window.from)} – {formatDate(window.to)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <div role="group" aria-label={t("zoomLabel")} className="flex rounded-lg bg-muted p-0.5">
          {ZOOMS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={zoom === value}
              onClick={() => onZoom(value)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                zoom === value && "bg-card text-foreground shadow-sm",
              )}
            >
              {t(`zoom.${value}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Chú thích màu giai đoạn và kiểu thanh. */
export function TimelineLegend({ extra }: { extra?: ReactNode }) {
  const t = useTranslations("Timeline");
  const tPhase = useTranslations("ProjectWork.phase");
  const swatch = "h-3 w-6 rounded";
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <li className="font-semibold text-foreground">{t("legendPhase")}</li>
      {(Object.keys(PHASE_COLOR) as (keyof typeof PHASE_COLOR)[]).map((phase) => (
        <li key={phase} className="flex items-center gap-1.5">
          <span className={swatch} style={{ background: PHASE_COLOR[phase] }} aria-hidden />
          {tPhase(phase)}
        </li>
      ))}
      <li className="mx-1 h-4 w-px bg-border" aria-hidden />
      <li className="font-semibold text-foreground">{t("legendStatus")}</li>
      <li className="flex items-center gap-1.5">
        <span className={cn(swatch, BAR_CLASS.todo)} style={barStyle("DEVELOPMENT")} aria-hidden />
        {t("legendTodo")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(swatch, BAR_CLASS.doing)} style={barStyle("DEVELOPMENT")} aria-hidden />
        {t("legendDoing")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(swatch, BAR_CLASS.done)} aria-hidden />
        {t("legendDone")}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className={cn(
            swatch,
            "border border-destructive bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--destructive)_28%,var(--card))_0_5px,color-mix(in_oklch,var(--destructive)_8%,var(--card))_5px_10px)]",
          )}
          aria-hidden
        />
        {t("legendLate")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn(swatch, BAR_CLASS.todo, "border-dashed")} style={barStyle("DEVELOPMENT")} aria-hidden />
        {t("legendSprint")}
      </li>
      {extra}
    </ul>
  );
}

const ZONE_FILL: Record<WorkloadZone, string> = { GREEN: "bg-success", YELLOW: "bg-warning", RED: "bg-destructive" };
const ZONE_TINT: Record<WorkloadZone, string> = { GREEN: "bg-success/8", YELLOW: "bg-warning/10", RED: "bg-destructive/10" };
const ZONE_TEXT: Record<WorkloadZone, string> = { GREEN: "text-foreground", YELLOW: "text-warning", RED: "text-destructive" };

/** Chiều cao (px) của mức 100% trong cột tải; cột cao nhất 140%. */
const FULL_HEIGHT = 40;

/**
 * Hàng biểu đồ tải: mỗi tuần (hoặc ngày) một cột, chiều cao = tải ÷ năng lực, vạch đứt ở 100%, màu theo vùng; nhãn OT khi
 * có làm thêm giờ đã duyệt. Số giờ ghi ngay dưới cột.
 */
export function LoadHistogram({ cells, window }: { cells: LoadCell[]; window: TimelineWindow }) {
  const t = useTranslations("Timeline");
  return (
    <>
      {cells.map((cell) => {
        const span = timelineSpan(cell.start, cell.end, window.from, window.to);
        if (!span) return null;
        const ratio = cell.capacityMinutes > 0 ? cell.loadMinutes / cell.capacityMinutes : cell.loadMinutes > 0 ? 1.4 : 0;
        const height = cell.loadMinutes > 0 ? Math.max(3, Math.min(1.4, ratio) * FULL_HEIGHT) : 0;
        const label = t("loadAria", {
          start: formatDate(cell.start),
          load: hoursText(cell.loadMinutes),
          capacity: hoursText(cell.capacityMinutes),
          zone: t(`zone.${cell.zone}`),
          overtime: hoursText(cell.overtimeMinutes),
          hasOvertime: String(cell.overtimeMinutes > 0),
        });
        const narrow = span.widthPercent < 4;
        return (
          <div
            key={cell.key}
            role="img"
            aria-label={label}
            title={label}
            className="absolute inset-y-0 flex flex-col items-stretch gap-1 px-[3px] pt-2 pb-1.5"
            style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
          >
            <div className={cn("relative h-14 rounded-md", ZONE_TINT[cell.zone])}>
              <span
                className={cn("absolute inset-x-[18%] bottom-0 rounded-t-[4px] rounded-b-[2px] transition-[height] duration-300 motion-reduce:transition-none", ZONE_FILL[cell.zone])}
                style={{ height }}
              />
              <span className="absolute inset-x-0 border-t-[1.5px] border-dashed border-muted-foreground/70" style={{ bottom: FULL_HEIGHT }} />
              {cell.overtimeMinutes > 0 && !narrow && (
                <span className="absolute top-0.5 right-0.5 rounded border border-primary/30 bg-card px-1 text-[9px] leading-3 font-bold text-primary">
                  {t("otTag")}
                </span>
              )}
            </div>
            {!narrow && (
              <>
                <span className={cn("truncate text-center text-[11px] leading-3 font-bold tabular-nums", ZONE_TEXT[cell.zone])}>
                  {t("loadHours", { load: hoursText(cell.loadMinutes), capacity: hoursText(cell.capacityMinutes) })}
                </span>
                {cell.note && <span className="truncate text-center text-[10px] leading-3 text-muted-foreground">{cell.note}</span>}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

