"use client";

import { ClipboardCheckIcon, GaugeIcon, TimerIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTeamDashboard } from "../hooks";
import { weekDays, withSeriesColors } from "../rules";
import type { AwayPerson, PersonUtilization, TeamDashboard } from "../types";
import { BlockSection, Panel } from "./block-section";
import { DonutChart } from "./donut-chart";
import { HeroRow, HeroStat } from "./hero-stat";
import { ExpandButton, useExpandable } from "./expandable";
import { StatTile } from "./stat-tile";

/** Tab Đội: người có cấp dưới trên sơ đồ tổ chức. */
export function TeamTab() {
  const t = useTranslations("Dashboard.Team");
  const query = useTeamDashboard();

  return (
    <BlockSection title={t("title")} description={t("description")}>
      {query.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <TeamView data={query.data} />
      )}
    </BlockSection>
  );
}

const BUCKETS = ["0", "1-50", "51-80", "81-100", "over-100"] as const;

/** Nhóm của một người theo % kế hoạch, cùng mốc với histogram của khối Nguồn lực. */
function bucketOf(percent: number): (typeof BUCKETS)[number] {
  if (percent <= 0) return "0";
  if (percent <= 50) return "1-50";
  if (percent <= 80) return "51-80";
  return percent <= 100 ? "81-100" : "over-100";
}

function TeamView({ data }: { data: TeamDashboard }) {
  const t = useTranslations("Dashboard.Team");
  const tResources = useTranslations("Dashboard.Resources");
  const parts = withSeriesColors(
    BUCKETS.map((key) => ({
      key,
      label: tResources(`bucket.${key}`),
      value: data.members.filter((member) => bucketOf(member.plannedPercent) === key).length,
    })),
  );

  return (
    <div className="grid gap-3">
      <HeroRow>
        <HeroStat label={t("people")} value={data.people} icon={UsersIcon} tone="people" />
        <HeroStat
          label={t("pendingApprovals")}
          value={data.pendingApprovals}
          icon={ClipboardCheckIcon}
          tone="approval"
          href="/approvals"
        />
        <HeroStat
          label={t("planned")}
          value={`${data.plannedPercent}%`}
          icon={GaugeIcon}
          tone="project"
          detail={t("plannedDetail")}
        />
        <StatTile
          label={t("lateRate")}
          icon={TimerIcon}
          tone="time"
          value={data.lateRatePercent === null ? null : `${data.lateRatePercent}%`}
          pending="timesheet"
        />
      </HeroRow>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:items-start">
        <Panel title={t("distributionTitle")}>
          <DonutChart parts={parts} centerLabel={t("distributionCenter")} title={t("distributionTitle")} />
        </Panel>
        <MembersPanel members={data.members} />
      </div>
      <AwayPanel people={data.awayThisWeek} weekStart={data.weekStart} />
    </div>
  );
}

/** Mỗi người một dòng, 7 ô thứ Hai → Chủ nhật; ô có chữ (Nghỉ / WFH, buổi) nên không phụ thuộc màu. */
function AwayPanel({ people, weekStart }: { people: AwayPerson[]; weekStart: string }) {
  const t = useTranslations("Dashboard.Team");
  const days = weekDays(weekStart);
  const list = useExpandable(people);

  return (
    <Panel title={t("awayTitle")} description={people.length ? formatDate(weekStart) + " – " + formatDate(days[6]) : t("awayEmpty")}>
      {people.length > 0 && (
        <ul className="grid gap-2">
          {list.shown.map(({ person, days: away }) => (
            <li key={person.id} className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar name={person.fullName} seed={person.employeeCode || person.id} size="sm" />
                <span className="truncate text-sm font-medium">{person.fullName}</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const entry = away.find((item) => item.date === day);
                  const label = entry
                    ? `${formatDate(day)}: ${t(entry.kind === "LEAVE" ? "leave" : "remote")} (${t(`part.${entry.part}`)})`
                    : formatDate(day);
                  return (
                    <div
                      key={day}
                      title={label}
                      aria-label={label}
                      className={cn(
                        "flex h-7 items-center justify-center rounded text-[11px] font-medium",
                        !entry && "bg-muted/60 text-muted-foreground",
                        entry?.kind === "LEAVE" && "bg-success/15 text-foreground",
                        entry?.kind === "REMOTE" && "bg-info/15 text-foreground",
                      )}
                    >
                      {entry ? `${t(entry.kind === "LEAVE" ? "leave" : "remote")}${entry.part === "FULL_DAY" ? "" : " ½"}` : day.slice(8)}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ExpandButton list={list} />
    </Panel>
  );
}

/** Thanh ngang theo % kế hoạch, kèm nhãn trạng thái chữ khi vượt trần / quá nhiều việc / chưa có dự án. */
function MembersPanel({ members }: { members: PersonUtilization[] }) {
  const t = useTranslations("Dashboard.Team");
  const scale = Math.max(100, ...members.map((member) => member.plannedPercent));
  const list = useExpandable(members);

  return (
    <Panel title={t("membersTitle")} description={members.length ? undefined : t("membersEmpty")}>
      {members.length > 0 && (
        <ul className="grid gap-2.5">
          {list.shown.map((member) => (
            <li key={member.person.id} className="grid gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{member.person.fullName}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {member.overAllocated && <Badge variant="destructive">{t("badges.overAllocated")}</Badge>}
                  {member.overCapacity && <Badge variant="warning">{t("badges.overCapacity")}</Badge>}
                  {member.bench && <Badge variant="secondary">{t("badges.bench")}</Badge>}
                  <span className="w-10 text-right tabular-nums">{member.plannedPercent}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-chart-1/15" aria-hidden>
                <div
                  className={cn("h-2 rounded-full", member.plannedPercent > 100 ? "bg-destructive" : "bg-chart-1")}
                  style={{ width: `${(member.plannedPercent / scale) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ExpandButton list={list} />
    </Panel>
  );
}
