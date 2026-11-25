"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOrgTeams, useTeamLoad, useWorkErrorMessage } from "../work-hooks";
import { hoursText } from "../work-rules";
import type { AllocationViewerReach, TeamLoadRow, TeamLoadWeek, WorkloadZone } from "../work-types";
import { PersonAvatar } from "../timeline/timeline-parts";
import { heatLevel, type HeatLevel } from "../timeline/load-cells";
import type { TimelineWindow } from "../timeline/timeline-scale";
import { SimpleSelect } from "./simple-select";

const ALL_TEAMS = "all";

const HEAT_CLASS: Record<HeatLevel, string> = {
  leave:
    "bg-[repeating-linear-gradient(135deg,var(--muted)_0_4px,color-mix(in_oklch,var(--muted-foreground)_10%,var(--card))_4px_8px)] text-muted-foreground",
  empty: "bg-muted/40 text-muted-foreground/50",
  light: "bg-success/10 text-success",
  medium: "bg-success/22 text-success",
  full: "bg-success/38 text-[color-mix(in_oklch,var(--success)_70%,var(--foreground))]",
  over: "bg-warning/35 text-[color-mix(in_oklch,var(--warning)_75%,var(--foreground))]",
  overload: "bg-destructive/85 text-white",
};

const COUNT_CLASS: Record<WorkloadZone, string> = {
  RED: "bg-destructive/12 text-destructive",
  YELLOW: "bg-warning/12 text-warning",
  GREEN: "bg-success/12 text-success",
};
const COUNT_DOT: Record<WorkloadZone, string> = { RED: "bg-destructive", YELLOW: "bg-warning", GREEN: "bg-success" };

type Props = {
  reach: AllocationViewerReach;
  window: TimelineWindow;
  toolbar: ReactNode;
  onOpenPerson: (employeeId: string) => void;
};

/**
 * Chế độ "Cả nhóm" của /allocations: bảng nhiệt tải theo tuần của những người mình xem được lịch (cấp dưới, văn phòng
 * của HR, cả công ty), nặng nhất trước. Xem cả công ty thì phải lọc team hoặc gõ tên trước, để không tải 1.000 người.
 */
export function AllocationTeamView({ reach, window, toolbar, onOpenPerson }: Props) {
  const t = useTranslations("Allocations.Team");
  const errorMessage = useWorkErrorMessage();
  const [teamId, setTeamId] = useState(ALL_TEAMS);
  const [text, setText] = useState("");
  const keyword = useDebouncedValue(text.trim());
  const teams = useOrgTeams(true);
  const needsFilter = reach === "ALL" && teamId === ALL_TEAMS && keyword.length < 2;
  const load = useTeamLoad(
    { teamId: teamId === ALL_TEAMS ? undefined : teamId, keyword: keyword || undefined, from: window.from, to: window.to },
    !needsFilter,
  );

  const teamOptions = [
    { value: ALL_TEAMS, label: t("allTeams") },
    ...(teams.data ?? []).map((team) => ({ value: team.id, label: `${team.name} · ${team.departmentName}` })),
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {teams.isSuccess && teams.data.length > 0 && (
            <SimpleSelect id="team-filter" value={teamId} onChange={setTeamId} options={teamOptions} className="w-64" />
          )}
          <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <SearchIcon className="size-4" aria-hidden />
            <span className="sr-only">{t("search")}</span>
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-7 w-44 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </label>
        </div>
        {load.data && (
          <ul className="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label={t("countsLabel")}>
            {(["RED", "YELLOW", "GREEN"] as const).map((zone) => (
              <li key={zone} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1", COUNT_CLASS[zone])}>
                <span className={cn("size-1.5 rounded-full", COUNT_DOT[zone])} aria-hidden />
                {t(`count.${zone}`, { count: load.data.counts[zone] ?? 0 })}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {toolbar}
        {needsFilter ? (
          <EmptyState icon={<UsersRoundIcon />} title={t("filterFirstTitle")} description={t("filterFirst")} />
        ) : load.isPending ? (
          <LoadingState />
        ) : load.isError ? (
          <ErrorState error={load.error} title={errorMessage(load.error)} onRetry={() => load.refetch()} className="m-4" />
        ) : load.data.people.length === 0 ? (
          <EmptyState icon={<UsersRoundIcon />} title={t("emptyTitle")} description={t("empty")} />
        ) : (
          <HeatTable rows={load.data.people} onOpenPerson={onOpenPerson} />
        )}
        {load.data && load.data.total > load.data.people.length && (
          <p className="border-t bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
            {t("truncated", { shown: load.data.people.length, total: load.data.total })}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <li>{t("legendCell")}</li>
        <li className="flex items-center gap-1">
          {t("legendLight")}
          {(["light", "medium", "full", "over", "overload"] as const).map((level) => (
            <span key={level} className={cn("h-3 w-4 rounded-sm", HEAT_CLASS[level])} aria-hidden />
          ))}
          {t("legendHeavy")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm ring-2 ring-foreground ring-inset" aria-hidden />
          {t("legendPeak")}
        </li>
      </ul>
    </div>
  );
}

/** Bảng nhiệt tải theo tuần (một dòng một người), dùng cả ở trợ lý phân bổ AI. */
export function HeatTable({
  rows,
  onOpenPerson,
  compact = false,
}: {
  rows: TeamLoadRow[];
  onOpenPerson: (employeeId: string) => void;
  /** Bảng hẹp (trong bảng trợ lý): không giữ độ rộng tối thiểu của trang /allocations. */
  compact?: boolean;
}) {
  const t = useTranslations("Allocations.Team");
  const weeks = rows[0].weeks.map((week) => week.weekStart);
  const columns = {
    gridTemplateColumns: `${compact ? "minmax(9rem, 14rem)" : "minmax(12rem, 16rem)"} repeat(${weeks.length}, minmax(3.25rem, 1fr)) 2rem`,
  };
  return (
    <div className="overflow-x-auto">
      <div className={compact ? "min-w-0" : "min-w-[44rem]"}>
        <div className="grid border-b bg-muted/40 text-[11px] text-muted-foreground" style={columns}>
          <span className="px-4 py-2.5 text-xs font-medium">{t("headerPerson")}</span>
          {weeks.map((week) => (
            <span key={week} className="py-2.5 text-center tabular-nums">
              {formatDate(week).slice(0, 5)}
            </span>
          ))}
          <span />
        </div>
        {rows.map((row) => (
          <button
            key={row.person.id}
            type="button"
            onClick={() => onOpenPerson(row.person.id)}
            className="grid w-full items-center border-b border-border/60 text-left transition-colors last:border-b-0 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
            style={columns}
          >
            <span className="flex min-w-0 items-center gap-2.5 px-4 py-2">
              <PersonAvatar name={row.person.fullName} seed={row.person.employeeCode ?? row.person.id} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{row.person.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.teamName ?? row.person.employeeCode ?? ""}</span>
              </span>
            </span>
            {row.weeks.map((week) => (
              <HeatCell key={week.weekStart} week={week} peak={week.weekStart === row.peakWeekStart} />
            ))}
            <ChevronRightIcon className="mx-auto size-4 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

function HeatCell({ week, peak }: { week: TeamLoadWeek; peak: boolean }) {
  const t = useTranslations("Allocations.Team");
  const tZone = useTranslations("Timeline.zone");
  const level = heatLevel(week.loadMinutes, week.capacityMinutes, week.fullLeave);
  const over = level === "over" || level === "overload";
  const label = t("cellAria", {
    week: formatDate(week.weekStart),
    load: hoursText(week.loadMinutes),
    capacity: hoursText(week.capacityMinutes),
    zone: tZone(week.zone),
  });
  return (
    <span className="px-0.5 py-1.5" title={label}>
      <span
        className={cn(
          "flex h-11 flex-col items-center justify-center rounded-md leading-tight tabular-nums",
          HEAT_CLASS[level],
          peak && over && "ring-2 ring-foreground ring-inset",
        )}
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden className="text-xs font-bold">
          {level === "leave" ? t("leave") : level === "empty" ? "–" : `${hoursText(week.loadMinutes)}h`}
        </span>
        <span aria-hidden className="text-[10px] opacity-80">
          {level === "leave" || level === "empty" ? "" : week.percent === null ? "—" : `${week.percent}%`}
          {week.overtimeMinutes > 0 && " · OT"}
        </span>
      </span>
    </span>
  );
}

