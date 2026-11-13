"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todayIsoDate } from "@/lib/format";
import { useDashboardBlocks, useDashboardFilters, useDepartments, useOffices } from "../hooks";
import { availableTabs, DEFAULT_WEEKS, resolveTab, resourceRange } from "../rules";
import { RANGE_WEEKS, type DashboardFilters, type DashboardTab, type RangeWeeks } from "../types";
import { HrTab } from "./hr-block";
import { MyTab } from "./my-block";
import { OverviewTab } from "./overview-tab";
import { ResourcesTab } from "./resources-block";
import { TeamTab } from "./team-block";

/**
 * Trang /dashboard (3.6), trang phân tích theo phạm vi. Hỏi backend các khối được xem (`/api/dashboard/blocks`), dựng tab
 * theo đó: người quản lý có Tổng quan · Nguồn lực · Nhân sự · Đội · Của tôi, nhân viên chỉ có Của tôi. Tab và bộ lọc nằm
 * trên URL; bộ lọc chỉ hiện ở tab Nguồn lực và Nhân sự. Số liệu trong ngày của cá nhân nằm ở trang chủ.
 */
export function DashboardPage() {
  const t = useTranslations("Dashboard.Tabs");
  const tPage = useTranslations("Dashboard");
  const blocks = useDashboardBlocks();
  const [filters, setFilters] = useDashboardFilters();

  const today = todayIsoDate();
  const resourceQuery = useMemo(
    () => ({ officeId: filters.officeId, departmentId: filters.departmentId, ...resourceRange(today, filters.weeks) }),
    [filters.officeId, filters.departmentId, filters.weeks, today],
  );
  const hrQuery = useMemo(
    () => ({ officeId: filters.officeId, departmentId: filters.departmentId }),
    [filters.officeId, filters.departmentId],
  );

  if (blocks.isPending) return <LoadingState />;
  if (blocks.isError) return <ErrorState error={blocks.error} onRetry={() => blocks.refetch()} />;

  const tabs = availableTabs(blocks.data);
  const tab = resolveTab(filters.tab, tabs);
  const selectTab = (next: DashboardTab) => setFilters({ ...filters, tab: next === tabs[0] ? undefined : next });

  return (
    <div className="grid grid-cols-1 gap-5">
      <Tabs value={tab} onValueChange={(value) => selectTab(value as DashboardTab)} className="min-w-0 gap-5">
        {/* Một hàng gọn: tiêu đề bên trái, tab bên phải (di động: tab xuống dòng). Phạm vi, số người, khoảng ngày đã có ở
            thanh lọc và đầu mỗi tab; việc cần chú ý ở Nhắc việc. */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{tPage("title")}</h1>
          {tabs.length > 1 && (
            <div className="-mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none]">
              <TabsList variant="line" aria-label={t("label")}>
                {tabs.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {t(value)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}
        </div>

        {(tab === "resources" || tab === "hr") && (
          <FilterBar filters={filters} onChange={setFilters} showRange={tab === "resources"} />
        )}

        <TabsContent value="overview">
          <OverviewTab blocks={blocks.data} resourceQuery={resourceQuery} hrQuery={hrQuery} />
        </TabsContent>
        <TabsContent value="resources">
          <ResourcesTab query={resourceQuery} />
        </TabsContent>
        <TabsContent value="hr">
          <HrTab query={hrQuery} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab />
        </TabsContent>
        <TabsContent value="me">
          <MyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ALL = "all";

function FilterBar({
  filters,
  onChange,
  showRange,
}: {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  showRange: boolean;
}) {
  const t = useTranslations("Dashboard.Filters");
  const offices = useOffices(true);
  const departments = useDepartments(true);

  const officeItems: Record<string, string> = {
    [ALL]: t("allOffices"),
    ...Object.fromEntries((offices.data ?? []).map((office) => [office.id, office.name])),
  };
  const departmentItems: Record<string, string> = {
    [ALL]: t("allDepartments"),
    ...Object.fromEntries((departments.data ?? []).map((department) => [department.id, department.name])),
  };
  const rangeItems: Record<string, string> = Object.fromEntries(
    RANGE_WEEKS.map((weeks) => [String(weeks), t("weeks", { weeks })]),
  );
  const changed = Boolean(filters.officeId || filters.departmentId || filters.weeks !== DEFAULT_WEEKS);

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="z-20 flex flex-col gap-2 rounded-xl border bg-card/95 p-3 backdrop-blur sm:sticky sm:top-0 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <Select
        value={filters.officeId ?? ALL}
        onValueChange={(value) => onChange({ ...filters, officeId: value === ALL ? undefined : String(value) })}
        items={officeItems}
      >
        <SelectTrigger className="w-full sm:w-48" aria-label={t("office")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(officeItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.departmentId ?? ALL}
        onValueChange={(value) => onChange({ ...filters, departmentId: value === ALL ? undefined : String(value) })}
        items={departmentItems}
      >
        <SelectTrigger className="w-full sm:w-56" aria-label={t("department")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(departmentItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showRange && (
        <Select
          value={String(filters.weeks)}
          onValueChange={(value) => onChange({ ...filters, weeks: Number(value) as RangeWeeks })}
          items={rangeItems}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label={t("range")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(rangeItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <span className="text-xs text-muted-foreground sm:ml-auto">{t("hint")}</span>
      {changed && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ tab: filters.tab, weeks: DEFAULT_WEEKS })}>
          {t("reset")}
        </Button>
      )}
    </div>
  );
}
