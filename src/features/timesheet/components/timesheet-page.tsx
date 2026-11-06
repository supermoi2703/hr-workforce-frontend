"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, HousePlusIcon, TreePalmIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { todayIsoDate } from "@/lib/format";
import { freeParts, monthRange, shiftMonth } from "../calendar";
import { useMyLeave, useMyRemoteWork, useMyTimesheet } from "../hooks";
import { DayDetail } from "./day-detail";
import { LeaveRequestDialog } from "./leave-request-dialog";
import { MonthCalendar } from "./month-calendar";
import { MySchedulePanel } from "./my-schedule-panel";
import { RemoteWorkDialog } from "./remote-work-dialog";
import { TeamCalendar } from "./team-calendar";
import { TimesheetTable } from "./timesheet-table";

type Tab = "calendar" | "list" | "team" | "schedule";

/**
 * Bảng công của tôi: lịch tháng (bấm ngày để xem chi tiết và xin nghỉ), bảng công dạng danh sách có tổng cuối bảng,
 * giờ làm của tôi (đăng ký giờ riêng). Quản lý và HR văn phòng có thêm lịch đội, gồm cờ chấm ngoài văn phòng.
 */
export function TimesheetPage() {
  const t = useTranslations("Timesheet");
  const { hasRole } = useCurrentUser();
  const today = todayIsoDate();
  const [tab, setTab] = useState<Tab>("calendar");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string>(today);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestingRemote, setRequestingRemote] = useState<string | null>(null);
  const { from, to } = monthRange(month);
  const sheet = useMyTimesheet(from, to);
  const leave = useMyLeave();
  const requests = leave.data ?? [];
  const remote = useMyRemoteWork().data ?? [];
  // HR toàn công ty chưa xem được: API cần chọn văn phòng mà tab này chưa có ô chọn.
  const canSeeTeam = hasRole("MANAGER") || (hasRole("HR") && !hasRole("HR_COMPANY"));

  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  function select(day: string) {
    setSelected(day);
    setTab("calendar");
  }

  const monthNav = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => changeMonth(-1)} aria-label={t("month.previous")}>
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-28 text-center font-medium tabular-nums">{t("month.label", { month: Number(month.slice(5)), year: month.slice(0, 4) })}</span>
      <Button variant="outline" size="icon-sm" onClick={() => changeMonth(1)} aria-label={t("month.next")}>
        <ChevronRightIcon />
      </Button>
      {month !== today.slice(0, 7) && (
        <Button variant="ghost" size="sm" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>
          {t("month.today")}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" onClick={() => setRequestingRemote(selected >= today ? selected : today)}>
              <HousePlusIcon /> {t("requestRemote")}
            </Button>
            <Button onClick={() => setRequesting(selected >= today ? selected : today)}>
              <TreePalmIcon /> {t("requestLeave")}
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="calendar">{t("tabs.calendar")}</TabsTrigger>
            <TabsTrigger value="list">{t("tabs.list")}</TabsTrigger>
            {canSeeTeam && <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>}
            <TabsTrigger value="schedule">{t("tabs.schedule")}</TabsTrigger>
          </TabsList>
          {tab !== "schedule" && monthNav}
        </div>

        <TabsContent value="calendar" className="mt-4">
          {sheet.isPending ? (
            <LoadingState />
          ) : sheet.isError ? (
            <ErrorState error={sheet.error} onRetry={() => sheet.refetch()} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <MonthCalendar month={month} today={today} days={sheet.data.days} requests={requests} remote={remote} selected={selected} onSelect={setSelected} />
              <DayDetail
                date={selected}
                today={today}
                day={sheet.data.days.find((day) => day.workDate === selected)}
                requests={requests}
                remote={remote}
                onRequestLeave={() => setRequesting(selected)}
                onRequestRemote={() => setRequestingRemote(selected)}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {sheet.isPending ? (
            <LoadingState />
          ) : sheet.isError ? (
            <ErrorState error={sheet.error} onRetry={() => sheet.refetch()} />
          ) : (
            <TimesheetTable sheet={sheet.data} today={today} onSelect={select} />
          )}
        </TabsContent>

        {canSeeTeam && (
          <TabsContent value="team" className="mt-4">
            {tab === "team" && <TeamCalendar month={month} today={today} />}
          </TabsContent>
        )}

        <TabsContent value="schedule" className="mt-4">
          <MySchedulePanel />
        </TabsContent>
      </Tabs>

      {requesting && (
        <LeaveRequestDialog
          initialDate={requesting}
          allowedParts={freeParts(requests, requesting, remote)}
          onClose={() => setRequesting(null)}
        />
      )}
      {requestingRemote && (
        <RemoteWorkDialog
          initialDate={requestingRemote}
          allowedParts={freeParts(requests, requestingRemote, remote)}
          onClose={() => setRequestingRemote(null)}
        />
      )}
    </>
  );
}
