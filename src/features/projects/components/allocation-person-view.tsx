"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRangeIcon, CalendarX2Icon, ClockIcon, FolderKanbanIcon, GaugeIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { HeroBanner, HeroBannerBadge } from "@/components/shared/hero-banner";
import { formatDate } from "@/lib/format";
import { timelineSpan } from "../allocation-rules";
import { hoursText } from "../work-rules";
import type { PersonAllocations, PersonProjectTasks } from "../work-types";
import {
  LoadHistogram,
  SummaryBar,
  TaskBar,
  TimelineFrame,
  TimelineLegend,
  TimelineRow,
} from "../timeline/timeline-parts";
import { dayCells, weekCells } from "../timeline/load-cells";
import type { TimelineWindow, Zoom } from "../timeline/timeline-scale";

type Props = {
  schedule: PersonAllocations;
  isMine: boolean;
  window: TimelineWindow;
  zoom: Zoom;
  today: string;
  toolbar: ReactNode;
};

/** Chế độ "Một người" của /allocations: băng tóm tắt, biểu đồ tải, việc theo dự án, đơn đang chờ vào dự án. */
export function AllocationPersonView({ schedule, isMine, window, zoom, today, toolbar }: Props) {
  const t = useTranslations("Allocations.Schedule");
  const tZone = useTranslations("Timeline.zone");
  const router = useRouter();
  const { load } = schedule;
  const peak = load.peakWeek;
  // Dự án có việc trong khoảng lên trước; dự án không có việc chỉ còn một dòng tiêu đề.
  const projects = [...(schedule.projects ?? [])].sort((a, b) => Number(isEmpty(a)) - Number(isEmpty(b)));
  const pending = schedule.items.filter((item) => item.status === "PENDING");
  const overtime = load.weeks.reduce((sum, week) => sum + (week.overtimeMinutes ?? 0), 0);
  const days = zoom === "week" ? (schedule.days ?? []) : [];
  const cells = days.length > 0 ? dayCells(days) : weekCells(schedule.load.weeks, t("fullLeave"));
  const openTask = (code: string) => (key: string) =>
    router.push(`/projects/${encodeURIComponent(code)}?tab=list&task=${encodeURIComponent(key)}`);

  return (
    <div className="grid gap-4">
      <HeroBanner
        tone="project"
        icon={CalendarRangeIcon}
        className="rounded-xl"
        title={isMine ? t("myScheduleTitle") : t("scheduleOf", { name: schedule.employee.fullName })}
        badges={
          <>
            {schedule.employee.employeeCode && <HeroBannerBadge>{schedule.employee.employeeCode}</HeroBannerBadge>}
            <HeroBannerBadge>{tZone(load.zone)}</HeroBannerBadge>
          </>
        }
        description={t("period", { from: formatDate(schedule.from), to: formatDate(schedule.to) })}
        value={peak?.percent != null ? `${peak.percent}%` : "—"}
        valueLabel={peak ? t("peakWeekOf", { week: formatDate(peak.weekStart) }) : t("noLoad")}
        stats={[
          ...(peak
            ? [{ key: "peak", icon: GaugeIcon, label: t("peakHours", { load: hoursText(peak.loadMinutes), capacity: hoursText(peak.capacityMinutes) }) }]
            : []),
          ...(overtime > 0 ? [{ key: "ot", icon: ClockIcon, label: t("overtimeTotal", { hours: hoursText(overtime) }) }] : []),
          ...(load.unscheduledMinutes > 0
            ? [{ key: "unscheduled", icon: CalendarX2Icon, label: t("unscheduled", { hours: hoursText(load.unscheduledMinutes) }) }]
            : []),
          { key: "projects", icon: FolderKanbanIcon, label: t("projectCount", { count: projects.length }) },
        ]}
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {toolbar}
        <TimelineFrame
          window={window}
          zoom={zoom}
          today={today}
          corner={t("cornerProjects")}
          shadedDays={days.filter((day) => day.leave === "FULL").map((day) => day.date)}
        >
          <TimelineRow
            trackClassName="h-[6.25rem]"
            label={
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{days.length > 0 ? t("loadByDay") : t("loadByWeek")}</span>
                <span className="block text-xs text-muted-foreground">{t("loadHint")}</span>
              </span>
            }
          >
            <LoadHistogram cells={cells} window={window} />
          </TimelineRow>

          {projects.length === 0 && pending.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          )}
          {projects.map((project) => (
            <ProjectGroup key={project.projectId} project={project} window={window} today={today} onOpen={openTask(project.code)} />
          ))}
          {pending.length > 0 && (
            <>
              <TimelineRow group trackClassName="h-11" label={<span className="text-sm font-semibold">{t("pendingTitle")}</span>} />
              {pending.map((item) => {
                const span = timelineSpan(item.fromDate, item.toDate, window.from, window.to);
                return (
                  <TimelineRow
                    key={`${item.projectId}-${item.requestId ?? item.fromDate}`}
                    label={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{item.projectCode}</span>
                        {item.approvalRequestId && (
                          <Link href={`/approvals/${encodeURIComponent(item.approvalRequestId)}`} className="text-xs text-primary hover:underline">
                            {t("openApproval")}
                          </Link>
                        )}
                      </span>
                    }
                  >
                    {span && (
                      <span
                        className="absolute top-1/2 flex h-6 -translate-y-1/2 items-center truncate rounded-md border border-dashed border-pending bg-pending/20 px-2 text-[11px] font-semibold text-pending-foreground dark:text-pending"
                        style={{ left: `${span.leftPercent}%`, width: `${span.widthPercent}%` }}
                      >
                        {t("statusPending")}
                      </span>
                    )}
                  </TimelineRow>
                );
              })}
            </>
          )}
        </TimelineFrame>
      </div>
      <TimelineLegend
        extra={
          <>
            <li className="mx-1 h-4 w-px bg-border" aria-hidden />
            <li className="flex items-center gap-1.5">
              <span className="rounded border border-primary/30 bg-card px-1 text-[9px] leading-3 font-bold text-primary" aria-hidden>
                OT
              </span>
              {t("legendOvertime")}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-6 rounded border bg-muted" aria-hidden>
                <LockIcon className="m-auto size-2.5 text-muted-foreground" />
              </span>
              {t("legendHidden")}
            </li>
          </>
        }
      />
    </div>
  );
}

function ProjectGroup({
  project,
  window,
  today,
  onOpen,
}: {
  project: PersonProjectTasks;
  window: TimelineWindow;
  today: string;
  onOpen: (key: string) => void;
}) {
  const t = useTranslations("Allocations.Schedule");
  const first = project.canViewTasks
    ? project.tasks.reduce<string | null>((min, task) => (min === null || (task.start ?? task.end) < min ? (task.start ?? task.end) : min), null)
    : project.hiddenStart;
  const last = project.canViewTasks
    ? project.tasks.reduce<string | null>((max, task) => (max === null || task.end > max ? task.end : max), null)
    : project.hiddenEnd;
  const hiddenSpan = project.hiddenStart && project.hiddenEnd ? timelineSpan(project.hiddenStart, project.hiddenEnd, window.from, window.to) : null;

  return (
    <>
      <TimelineRow
        group
        trackClassName="h-12"
        label={
          <span className="min-w-0">
            <Link href={`/projects/${encodeURIComponent(project.code)}`} className="font-mono text-sm font-semibold text-primary hover:underline">
              {project.code}
            </Link>
            <span className="block truncate text-xs text-muted-foreground">
              {[project.name, project.pm ? t("pmOf", { name: project.pm.fullName }) : null, isEmpty(project) ? t("noTasks") : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        }
      >
        {first && last && <SummaryBar start={first} end={last} window={window} />}
      </TimelineRow>
      {project.canViewTasks ? (
        project.tasks.map((task) => (
            <TimelineRow
              key={task.id}
              label={
                <button
                  type="button"
                  onClick={() => onOpen(task.key)}
                  className="flex min-w-0 items-center gap-2 rounded-sm pl-4 text-left hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:pl-0"
                >
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{task.key}</span>
                  <span className="truncate text-sm">{task.title}</span>
                </button>
              }
            >
              <TaskBar task={task} window={window} today={today} onOpen={onOpen} />
            </TimelineRow>
          ))
      ) : isEmpty(project) ? null : (
        <TimelineRow
          label={
            <span className="flex min-w-0 items-center gap-2 pl-4 text-sm text-muted-foreground max-sm:pl-0">
              <LockIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t("hiddenTasks", { count: project.hiddenTaskCount })}</span>
            </span>
          }
        >
          {hiddenSpan && (
            <span
              role="img"
              aria-label={t("hiddenBar", { count: project.hiddenTaskCount, hours: hoursText(project.hiddenMinutes) })}
              className="absolute top-1/2 flex h-6 -translate-y-1/2 items-center truncate rounded-md border bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,color-mix(in_oklch,var(--muted-foreground)_12%,var(--card))_6px_12px)] px-2 text-[11px] font-semibold text-muted-foreground"
              style={{ left: `${hiddenSpan.leftPercent}%`, width: `${hiddenSpan.widthPercent}%` }}
            >
              {t("hiddenBar", { count: project.hiddenTaskCount, hours: hoursText(project.hiddenMinutes) })}
            </span>
          )}
        </TimelineRow>
      )}
    </>
  );
}

function isEmpty(project: PersonProjectTasks): boolean {
  return project.canViewTasks ? project.tasks.length === 0 : project.hiddenTaskCount === 0;
}
