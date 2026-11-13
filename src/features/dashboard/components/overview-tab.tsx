"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  ArmchairIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileClockIcon,
  GaugeIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IconTile, type DomainTone } from "@/components/shared/icon-tile";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HrQuery, ResourceQuery } from "../api";
import { useHrDashboard, useResourceDashboard, useTeamDashboard } from "../hooks";
import type { DashboardBlock } from "../types";
import { AreaTile } from "./area-tile";
import { Panel } from "./block-section";
import { HeroRow, HeroStat } from "./hero-stat";
import { HrHeroes, MovementChart } from "./hr-block";
import { ResourceHeroes } from "./resources-block";

type Reminder = { key: string; label: string; count: number; icon: LucideIcon; tone: DomainTone; href: string };

/**
 * Tab Tổng quan cho người có khối quản lý: thẻ nổi bật của từng khối, Nhắc việc, hai biểu đồ chính thu nhỏ. Dùng chung
 * query (cùng key) với các tab khác nên chuyển tab không tải lại.
 */
export function OverviewTab({
  blocks,
  resourceQuery,
  hrQuery,
}: {
  blocks: DashboardBlock[];
  resourceQuery: ResourceQuery;
  hrQuery: HrQuery;
}) {
  const t = useTranslations("Dashboard.Overview");
  const tTeam = useTranslations("Dashboard.Team");
  const tResources = useTranslations("Dashboard.Resources");
  const tCommon = useTranslations("Dashboard.Common");
  const hasResources = blocks.includes("RESOURCES");
  const hasHr = blocks.includes("HR");
  const hasTeam = blocks.includes("TEAM");
  const resources = useResourceDashboard(resourceQuery, hasResources);
  const hr = useHrDashboard(hrQuery, hasHr);
  const team = useTeamDashboard(hasTeam);

  const loading = (hasResources && resources.isPending) || (hasHr && hr.isPending) || (hasTeam && team.isPending);
  const failed = [hasResources && resources, hasHr && hr, hasTeam && team].find((query) => query && query.isError);
  const reminders: Reminder[] = [];
  if (hasHr && hr.data) {
    // Không có quyền xem hợp đồng (contracts = null) thì không có dòng này, không ghi 0.
    if (hr.data.contracts) {
      reminders.push({
        key: "contracts",
        label: t("reminders.contracts"),
        count: hr.data.contracts.within30Days,
        icon: FileClockIcon,
        tone: "people",
        href: "/dashboard?tab=hr",
      });
    }
    reminders.push({
      key: "onboarding",
      label: t("reminders.onboarding"),
      count: hr.data.onboarding,
      icon: UserPlusIcon,
      tone: "leave",
      href: "/employees",
    });
  }
  if (hasTeam && team.data) {
    reminders.push({
      key: "approvals",
      label: t("reminders.approvals"),
      count: team.data.pendingApprovals,
      icon: ClipboardCheckIcon,
      tone: "approval",
      href: "/approvals",
    });
  }
  if (hasResources && resources.data) {
    reminders.push({
      key: "overloaded",
      label: t("reminders.overloaded"),
      count: resources.data.summary.overloadedCount,
      icon: AlertTriangleIcon,
      tone: "approval",
      href: "/dashboard?tab=resources",
    });
    reminders.push({
      key: "bench",
      label: t("reminders.bench"),
      count: resources.data.summary.benchCount,
      icon: ArmchairIcon,
      tone: "project",
      href: "/dashboard?tab=resources",
    });
  }
  // Việc có số trước; giữ thứ tự cố định trong mỗi nhóm.
  const sorted = [...reminders].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));

  if (failed) {
    return <ErrorState error={failed.error} onRetry={() => failed.refetch()} />;
  }

  return (
    <div className="grid gap-3">
      <HeroRow>
        {hasHr && hr.data && <HrHeroes data={hr.data} compact />}
        {hasResources && resources.data && <ResourceHeroes data={resources.data} compact />}
        {hasTeam && team.data && (
          <HeroStat
            label={tTeam("pendingApprovals")}
            value={team.data.pendingApprovals}
            icon={ClipboardCheckIcon}
            tone="approval"
            href="/dashboard?tab=team"
          />
        )}
        {loading && <Skeleton className="h-32 rounded-xl" />}
      </HeroRow>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <Panel title={t("remindersTitle")} description={!loading && sorted.every((r) => r.count === 0) ? t("remindersEmpty") : undefined}>
          {loading && !sorted.length ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : (
            <ul className="grid gap-1">
              {sorted.map((reminder) => (
                <li key={reminder.key}>
                  <Link
                    href={reminder.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60",
                      reminder.count === 0 && "opacity-60",
                    )}
                  >
                    <IconTile icon={reminder.icon} tone={reminder.tone} className="size-8" />
                    <span className="flex-1 text-sm">{reminder.label}</span>
                    <span className="text-base font-semibold tabular-nums">{reminder.count}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="sr-only">{t("open")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid gap-3">
          {hasResources && resources.data && (
            <AreaTile
              label={t("trendTitle")}
              icon={GaugeIcon}
              tone="project"
              value={`${resources.data.summary.plannedPercent}%`}
              detail={tResources("description", {
                from: formatDate(resources.data.from),
                to: formatDate(resources.data.to),
                people: tCommon("people", { count: resources.data.summary.people }),
              })}
              points={resources.data.trend.map((point) => ({
                label: formatDate(point.weekStart).slice(0, 5),
                value: point.plannedPercent,
              }))}
              color="var(--chart-1)"
              seriesLabel={tResources("series.planned")}
              unit="%"
            />
          )}
          {hasHr && hr.data && (
            <Panel title={t("movementTitle")}>
              <MovementChart months={hr.data.months} height={200} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
