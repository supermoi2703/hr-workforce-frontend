"use client";

import Link from "next/link";
import {
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  ClipboardCheckIcon,
  FilePlus2Icon,
  ReceiptTextIcon,
  TimerIcon,
  TreePalmIcon,
  UserSearchIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_TONE_TEXT, type DomainTone } from "@/components/shared/icon-tile";
import { RequireAccess } from "@/components/shared/require-access";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useMyDashboard } from "@/features/dashboard/hooks";
import { BackendStatusCard } from "@/features/system/components/backend-status-card";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import type { Access } from "@/lib/auth/types";
import { formatDate, formatTime, todayIsoDate } from "@/lib/format";
import { partOfDayInVietnam } from "./_components/greeting";
import { MetricStrip, type Metric } from "./_components/metric-strip";
import { WeekStrip, weekOf } from "./_components/week-strip";

type MeStatus = Parameters<ReturnType<typeof useTranslations<"Dashboard.Me.status">>>[0];

/**
 * Chỉ số trong ngày, lấy từ `/api/dashboard/me` (3.6). Chưa có số (chưa gắn hồ sơ, đang tải) thì để trống, ô tự hiện
 * "Chưa có dữ liệu". Phân tích dài hạn của cá nhân nằm ở /dashboard, tab Của tôi.
 */
function useTodayMetrics(): Metric[] {
  const t = useTranslations("Home.metrics");
  const tStatus = useTranslations("Dashboard.Me.status");
  const me = useMyDashboard().data;
  const today = me?.today;
  const leave = me?.leave;
  return [
    {
      label: t("checkIn"),
      icon: TimerIcon,
      tone: "time",
      href: "/attendance",
      value: today?.firstIn ? formatTime(today.firstIn) : undefined,
      detail: today && tStatus.has(today.status as MeStatus) ? tStatus(today.status as MeStatus) : undefined,
    },
    {
      label: t("leaveLeft"),
      icon: TreePalmIcon,
      tone: "leave",
      href: "/leave",
      value: leave ? t("leaveValue", { count: leave.available }) : undefined,
      detail: leave ? t("leaveUsed", { used: leave.used, total: leave.annualDays }) : undefined,
    },
    {
      label: t("pending"),
      icon: ClipboardCheckIcon,
      tone: "approval",
      href: "/approvals?tab=mine",
      value: me ? me.pendingRequests : undefined,
      detail: me ? t("pendingDetail") : undefined,
    },
    {
      label: t("projects"),
      icon: BriefcaseBusinessIcon,
      tone: "project",
      href: "/projects",
      value: me ? me.projects.length : undefined,
      detail: me && me.projects.length ? t("projectsDetail", { percent: me.allocatedPercent }) : undefined,
    },
  ];
}

type QuickLinkKey = "leave" | "payslips" | "officeCalendar" | "employees";

const QUICK_LINKS: { titleKey: QuickLinkKey; href: string; icon: LucideIcon; tone: DomainTone; access?: Access }[] = [
  { titleKey: "leave", href: "/leave", icon: FilePlus2Icon, tone: "leave" },
  { titleKey: "payslips", href: "/payslips", icon: ReceiptTextIcon, tone: "money" },
  { titleKey: "officeCalendar", href: "/office-calendar", icon: CalendarClockIcon, tone: "time", access: { roles: ["ADMIN", "HR"] } },
  { titleKey: "employees", href: "/employees", icon: UserSearchIcon, tone: "people", access: { roles: ["ADMIN", "HR", "MANAGER"] } },
];

export default function HomePage() {
  const { user, can } = useCurrentUser();
  const t = useTranslations("Home");
  const format = useFormatter();
  const metrics = useTodayMetrics();
  const now = new Date();
  const today = todayIsoDate(now);
  const week = weekOf(today);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {user && <UserAvatar name={user.displayName} seed={user.id} size="lg" />}
          <div className="min-w-0">
            <h1 className="font-heading text-[1.375rem] leading-tight font-semibold tracking-tight text-balance">
              {t(`greeting.${partOfDayInVietnam(now)}`, { name: user?.displayName ?? "" })}
            </h1>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {format.dateTime(now, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" })}
            </p>
          </div>
        </div>
      </header>

      <MetricStrip metrics={metrics} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t("week.title")}</CardTitle>
            <CardDescription>
              {formatDate(week[0])} – {formatDate(week[6])}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekStrip today={today} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("quickLinks.title")}</CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <ul>
                {QUICK_LINKS.filter((link) => can(link.access)).map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <link.icon className={`size-4 ${DOMAIN_TONE_TEXT[link.tone]}`} aria-hidden />
                      {t(`quickLinks.${link.titleKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Chỉ quản trị viên cần biết tình trạng kết nối hệ thống. */}
          <RequireAccess access={{ roles: ["ADMIN"] }} fallback={null}>
            <BackendStatusCard />
          </RequireAccess>
        </div>
      </div>
    </>
  );
}
