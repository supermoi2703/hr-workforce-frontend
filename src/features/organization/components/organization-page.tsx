"use client";

import { useEffect, useState } from "react";
import { Building2Icon, MapPinIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useOrgChart, useOrgChartOffices, useOrgPageState } from "../hooks";
import { directorOf, filterDepartments, resolveNode } from "../rules";
import type { OrgNode, OrgView } from "../types";
import { OrgTree } from "./org-tree";
import { NodeDetail, OverviewDetail, SearchDetail } from "./unit-detail";

const SEARCH_DELAY_MS = 350;

/**
 * Cơ cấu tổ chức (/organization): cây phòng ban → team bên trái, chi tiết nút đang chọn bên phải (sơ đồ báo cáo +
 * danh sách người). Hai cách xem: cả công ty theo phòng ban, hoặc theo từng văn phòng. Mọi người đã đăng nhập đều xem
 * được (06 C1). Cách xem, văn phòng, nút đang chọn, từ khóa nằm trên URL.
 */
export function OrganizationPage() {
  const t = useTranslations("Organization");
  const { state, setState } = useOrgPageState();
  const offices = useOrgChartOffices();

  const officeView = state.view === "office";
  // Chưa chọn văn phòng thì xem văn phòng đầu tiên (không ghi lên URL, để link "theo văn phòng" luôn mở được).
  const officeId = officeView ? (state.officeId ?? offices.data?.[0]?.id) : undefined;
  const office = offices.data?.find((o) => o.id === officeId);
  const chart = useOrgChart(officeId, !officeView || !!officeId);
  // Giám đốc lấy từ cây toàn công ty: xem theo văn phòng thì Ban Giám đốc có thể không có ai ở văn phòng đó.
  const companyChart = useOrgChart(undefined, officeView);
  const director = directorOf(officeView ? companyChart.data : chart.data);
  const effectiveState = { ...state, officeId };

  const [unitFilter, setUnitFilter] = useState("");
  const [searchText, setSearchText] = useState(state.keyword ?? "");

  // Gõ xong một nhịp mới tìm, để không gọi API theo từng phím.
  useEffect(() => {
    const keyword = searchText.trim() || undefined;
    if (keyword === state.keyword) return;
    const timer = setTimeout(() => setState({ ...state, keyword }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, state, setState]);

  const select = (node: OrgNode | undefined) => {
    setSearchText("");
    setState({ ...state, node, keyword: undefined });
  };
  const changeView = (view: OrgView) => setState({ ...state, view, officeId: view === "office" ? state.officeId : undefined });

  const scopeLabel = officeView ? (office?.name ?? t("Tree.office")) : t("Tree.company");
  const departments = chart.data ? filterDepartments(chart.data.departments, unitFilter) : [];
  const resolved = resolveNode(chart.data, state.node);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t("searchPeople")}
                aria-label={t("searchPeople")}
                className="bg-card pr-8 pl-8 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  aria-label={t("clearSearch")}
                  className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
            <Tabs value={state.view} onValueChange={(value) => changeView(value as OrgView)}>
              <TabsList>
                <TabsTrigger value="department">
                  <Building2Icon aria-hidden /> {t("View.department")}
                </TabsTrigger>
                <TabsTrigger value="office">
                  <MapPinIcon aria-hidden /> {t("View.office")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="flex flex-col overflow-hidden rounded-xl border bg-card lg:sticky lg:top-4">
          <div className="flex flex-col gap-2 border-b p-3">
            {officeView && (
              <OfficePicker
                offices={offices.data ?? []}
                loading={offices.isPending}
                value={officeId}
                onChange={(id) => setState({ ...state, officeId: id })}
              />
            )}
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                placeholder={t("Tree.filter")}
                aria-label={t("Tree.filter")}
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="p-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
            {chart.isPending ? (
              <TreeSkeleton />
            ) : chart.error && !chart.data ? (
              <ErrorState error={chart.error} onRetry={() => chart.refetch()} className="border-0 p-4" />
            ) : chart.data ? (
              <>
                <OrgTree
                  rootLabel={scopeLabel}
                  rootCount={chart.data.employeeCount}
                  departments={departments}
                  selected={state.keyword ? undefined : state.node}
                  onSelect={select}
                  expandAll={!!unitFilter.trim()}
                />
                {unitFilter.trim() && departments.length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground">{t("Tree.noMatch")}</p>
                )}
              </>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-live="polite">
          {state.keyword ? (
            <SearchDetail state={effectiveState} scopeLabel={scopeLabel} onSelect={select} />
          ) : chart.isPending ? (
            <DetailSkeleton />
          ) : chart.error && !chart.data ? (
            <ErrorState error={chart.error} onRetry={() => chart.refetch()} className="m-4" />
          ) : !chart.data ? null : chart.data.departments.length === 0 ? (
            <EmptyState
              className="py-16"
              icon={<Building2Icon />}
              title={officeView ? t("Empty.officeTitle") : t("Empty.companyTitle")}
              description={officeView ? t("Empty.officeDescription") : t("Empty.companyDescription")}
            />
          ) : state.node && !resolved ? (
            <EmptyState
              className="py-16"
              icon={<SearchXIcon />}
              title={t("Empty.nodeTitle")}
              description={officeView ? t("Empty.nodeInOffice", { office: scopeLabel }) : t("Empty.nodeDescription")}
              action={
                <Button variant="outline" size="sm" onClick={() => select(undefined)}>
                  {t("Empty.backToOverview")}
                </Button>
              }
            />
          ) : resolved ? (
            <NodeDetail chart={chart.data} director={director} state={effectiveState} scopeLabel={scopeLabel} onSelect={select} resolved={resolved} />
          ) : (
            <OverviewDetail chart={chart.data} director={director} state={effectiveState} scopeLabel={scopeLabel} onSelect={select} />
          )}
        </section>
      </div>
    </>
  );
}

function OfficePicker({
  offices,
  loading,
  value,
  onChange,
}: {
  offices: { id: string; name: string; city: string | null; employeeCount: number }[];
  loading: boolean;
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("Organization");
  if (loading) return <Skeleton className="h-8 w-full" />;
  if (offices.length === 0) return <p className="text-sm text-muted-foreground">{t("Empty.noOffices")}</p>;
  const items = Object.fromEntries(
    offices.map((office) => [office.id, t("officeOption", { name: office.name, count: office.employeeCount })]),
  );
  return (
    <Select value={value ?? null} onValueChange={(next) => next && onChange(String(next))} items={items}>
      <SelectTrigger className="w-full" aria-label={t("View.office")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {offices.map((office) => (
          <SelectItem key={office.id} value={office.id}>
            {items[office.id]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TreeSkeleton() {
  return (
    <div className="space-y-2 p-1" aria-hidden>
      {[60, 80, 70, 85, 55, 75].map((width, index) => (
        <Skeleton key={index} className="h-6" style={{ width: `${width}%`, marginLeft: index % 3 === 2 ? "1.5rem" : 0 }} />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <Skeleton className="mx-auto h-16 w-60" />
      <div className="flex justify-center gap-3">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-16 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
