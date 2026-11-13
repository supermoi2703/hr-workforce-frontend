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
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_TONE_TEXT, type DomainTone } from "@/components/shared/icon-tile";
import { RequireAccess } from "@/components/shared/require-access";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useMyDashboard } from "@/features/dashboard/hooks";
import { BackendStatusCard } from "@/features/system/components/backend-status-card";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import type { Access } from "@/lib/auth/types";
import { formatDate, formatLongDate, formatTime, todayIsoDate } from "@/lib/format";
import { MetricStrip, type Metric } from "./_components/metric-strip";
import { WeekStrip, weekOf } from "./_components/week-strip";

type MeStatus = Parameters<ReturnType<typeof useTranslations<"Dashboard.Me.status">>>[0];

/**
 * Chỉ số trong ngày, lấy từ `/api/dashboard/me` (3.6). Chưa có số (chưa gắn hồ sơ, đang tải) thì để trống, ô tự hiện
 * "Chưa có dữ liệu". Phân tích dài hạn của cá nhân nằm ở /dashboard, tab Của tôi.
 */
function useTodayMetrics(): Metric[] {
  const tStatus = useTranslations("Dashboard.Me.status");
  const me = useMyDashboard().data;
  const today = me?.today;
  const leave = me?.leave;
  return [
    {
      label: "Giờ vào hôm nay",
      icon: TimerIcon,
      tone: "time",
      href: "/attendance",
      value: today?.firstIn ? formatTime(today.firstIn) : undefined,
      detail: today && tStatus.has(today.status as MeStatus) ? tStatus(today.status as MeStatus) : undefined,
    },
    {
      label: "Ngày phép còn lại",
      icon: TreePalmIcon,
      tone: "leave",
      href: "/leave",
      value: leave ? `${leave.available} ngày` : undefined,
      detail: leave ? `Đã dùng ${leave.used}/${leave.annualDays} ngày` : undefined,
    },
    {
      label: "Đơn của tôi đang chờ",
      icon: ClipboardCheckIcon,
      tone: "approval",
      href: "/approvals?tab=mine",
      value: me ? me.pendingRequests : undefined,
      detail: me ? "Chờ người khác duyệt" : undefined,
    },
    {
      label: "Dự án đang tham gia",
      icon: BriefcaseBusinessIcon,
      tone: "project",
      href: "/projects",
      value: me ? me.projects.length : undefined,
      detail: me && me.projects.length ? `${me.allocatedPercent}% thời gian` : undefined,
    },
  ];
}

const QUICK_LINKS: { title: string; href: string; icon: LucideIcon; tone: DomainTone; access?: Access }[] = [
  { title: "Tạo đơn nghỉ phép", href: "/leave", icon: FilePlus2Icon, tone: "leave" },
  { title: "Xem phiếu lương", href: "/payslips", icon: ReceiptTextIcon, tone: "money" },
  { title: "Lịch làm việc văn phòng", href: "/office-calendar", icon: CalendarClockIcon, tone: "time", access: { roles: ["ADMIN", "HR"] } },
  { title: "Tra cứu nhân viên", href: "/employees", icon: UserSearchIcon, tone: "people", access: { roles: ["ADMIN", "HR", "MANAGER"] } },
];

const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false });

function greeting(now: Date): string {
  const hour = Number(hourFormatter.format(now));
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export default function HomePage() {
  const { user, can } = useCurrentUser();
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
              {greeting(now)}, {user?.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">{formatLongDate(today)}</p>
          </div>
        </div>
      </header>

      <MetricStrip metrics={metrics} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Tuần này</CardTitle>
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
              <CardTitle>Truy cập nhanh</CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <ul>
                {QUICK_LINKS.filter((link) => can(link.access)).map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <link.icon className={`size-4 ${DOMAIN_TONE_TEXT[link.tone]}`} aria-hidden />
                      {link.title}
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
