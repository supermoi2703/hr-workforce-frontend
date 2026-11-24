"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRangeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Checkbox } from "@/components/ui/checkbox";
import { todayIsoDate } from "@/lib/format";
import { useProjectTimeline, useWorkErrorMessage } from "../work-hooks";
import { hoursText } from "../work-rules";
import type { Project } from "../types";
import type { ProjectTimeline, TimelinePerson, TimelineTask } from "../work-types";
import {
  PersonAvatar,
  SummaryBar,
  TaskBar,
  TimelineFrame,
  TimelineLegend,
  TimelineRow,
  TimelineToolbar,
  ZoneChip,
} from "../timeline/timeline-parts";
import { parseZoom, shiftedFrom, timelineWindow, type TimelineWindow, type Zoom } from "../timeline/timeline-scale";

type Props = {
  project: Project;
  onOpenTask: (key: string) => void;
  /** Mở tab Danh sách (dòng "Chưa lên lịch"). */
  onShowList: () => void;
};

/**
 * Tab "Lịch" của dự án (Gantt, workload bước 5): việc lá theo ngày hiệu lực, nhóm theo người, tô theo giai đoạn, vạch hôm
 * nay, dải sprint. Chỉ xem: bấm thanh để mở chi tiết việc. Mức phóng to và ngày đầu nằm trên URL (?zoom=&from=).
 */
export function ProjectTimelineTab({ project, onOpenTask, onShowList }: Props) {
  const t = useTranslations("Timeline");
  const errorMessage = useWorkErrorMessage();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = todayIsoDate();
  const zoom = parseZoom(params.get("zoom"));
  const window = timelineWindow(zoom, params.get("from"), today);
  const timeline = useProjectTimeline(project.id, window.from, window.to);
  const [showDone, setShowDone] = useState(true);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <TimelineToolbar
          window={window}
          zoom={zoom}
          onZoom={(value: Zoom) => update({ zoom: value === "month" ? null : value, from: null })}
          onShift={(direction) => update({ from: shiftedFrom(window.from, zoom, direction) })}
          onToday={() => update({ from: null })}
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={showDone} onCheckedChange={(checked) => setShowDone(checked === true)} />
            {t("showDone")}
          </label>
        </TimelineToolbar>
        {timeline.isPending ? (
          <LoadingState />
        ) : timeline.isError ? (
          <ErrorState error={timeline.error} title={errorMessage(timeline.error)} onRetry={() => timeline.refetch()} className="m-4" />
        ) : (
          <TimelineBody data={timeline.data} window={window} zoom={zoom} today={today} showDone={showDone} onOpenTask={onOpenTask} onShowList={onShowList} />
        )}
      </div>
      <TimelineLegend />
    </div>
  );
}

type Group = { key: string; person: TimelinePerson | null; tasks: TimelineTask[] };

function TimelineBody({
  data,
  window,
  zoom,
  today,
  showDone,
  onOpenTask,
  onShowList,
}: {
  data: ProjectTimeline;
  window: TimelineWindow;
  zoom: Zoom;
  today: string;
  showDone: boolean;
  onOpenTask: (key: string) => void;
  onShowList: () => void;
}) {
  const t = useTranslations("Timeline");
  const groups = useMemo(() => groupByPerson(data, showDone), [data, showDone]);
  const names = useMemo(() => new Map(data.people.map((p) => [p.person.id, p.person.fullName])), [data.people]);
  const empty = groups.every((group) => group.tasks.length === 0);

  return (
    <>
      {empty ? (
        <EmptyState icon={<CalendarRangeIcon />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <TimelineFrame window={window} zoom={zoom} today={today} corner={t("cornerPeople")} sprints={data.sprints}>
          {groups.map((group) =>
            group.tasks.length === 0 && group.person === null ? null : (
              <div key={group.key}>
                <TimelineRow group trackClassName="h-12" label={<GroupLabel group={group} />}>
                  {group.tasks.length > 0 && (
                    <SummaryBar
                      start={group.tasks.reduce((min, task) => ((task.start ?? task.end) < min ? (task.start ?? task.end) : min), group.tasks[0].start ?? group.tasks[0].end)}
                      end={group.tasks.reduce((max, task) => (task.end > max ? task.end : max), group.tasks[0].end)}
                      window={window}
                    />
                  )}
                </TimelineRow>
                {group.tasks.map((task) => (
                  <TimelineRow
                    key={task.id}
                    label={
                      <button
                        type="button"
                        onClick={() => onOpenTask(task.key)}
                        className="flex min-w-0 items-center gap-2 rounded-sm pl-10 text-left hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:pl-2"
                      >
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{task.key}</span>
                        <span className={`truncate text-sm ${task.status === "DONE" ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}>
                          {task.title}
                        </span>
                      </button>
                    }
                  >
                    <TaskBar
                      task={task}
                      window={window}
                      today={today}
                      assigneeName={task.assigneeId ? (names.get(task.assigneeId) ?? null) : null}
                      onOpen={onOpenTask}
                    />
                  </TimelineRow>
                ))}
              </div>
            ),
          )}
        </TimelineFrame>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5 text-sm">
        {data.unscheduledCount > 0 ? (
          <button type="button" onClick={onShowList} className="font-medium text-primary hover:underline">
            {t("unscheduled", { count: data.unscheduledCount })}
          </button>
        ) : (
          <span className="text-muted-foreground">{t("allScheduled")}</span>
        )}
        <span className="text-muted-foreground">{t("clickHint")}</span>
      </div>
    </>
  );
}

function GroupLabel({ group }: { group: Group }) {
  const t = useTranslations("Timeline");
  if (group.person === null) {
    return (
      <>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed text-xs text-muted-foreground" aria-hidden>
          ?
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("unassigned")}</span>
          <span className="block text-xs text-muted-foreground">{t("taskCount", { count: group.tasks.length })}</span>
        </span>
      </>
    );
  }
  const { person, zone, openTaskCount, remainingMinutes, role } = group.person;
  return (
    <>
      <PersonAvatar name={person.fullName} seed={person.employeeCode ?? person.id} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{person.fullName}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {zone && <ZoneChip zone={zone} className="px-1.5 py-0 text-[10px]" />}
          <span className="truncate">
            {role === null ? t("leftProject") : t("personSummary", { count: openTaskCount, hours: hoursText(remainingMinutes) })}
          </span>
        </span>
      </span>
    </>
  );
}

/** Nhóm việc theo người theo thứ tự backend trả (thành viên trước, theo tên); việc chưa giao ở cuối. */
function groupByPerson(data: ProjectTimeline, showDone: boolean): Group[] {
  const tasks = showDone ? data.tasks : data.tasks.filter((task) => task.status !== "DONE");
  const known = new Set(data.people.map((p) => p.person.id));
  const groups: Group[] = data.people.map((person) => ({
    key: person.person.id,
    person,
    tasks: tasks.filter((task) => task.assigneeId === person.person.id),
  }));
  const rest = tasks.filter((task) => task.assigneeId === null || !known.has(task.assigneeId));
  if (rest.length > 0) groups.push({ key: "unassigned", person: null, tasks: rest });
  return groups;
}
