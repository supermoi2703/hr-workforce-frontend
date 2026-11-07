"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BanknoteIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate, todayIsoDate } from "@/lib/format";
import { useOrgDepartments, useOrgOffices, useProjectCreateScope, useProjectFilters, useProjects } from "../hooks";
import { canCreateProject } from "../rules";
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectListItem, type ProjectStatus, type ProjectType } from "../types";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectRoleBadge, ProjectStatusBadge } from "./project-badges";

/**
 * Danh sách dự án. Mọi nhân viên xem được thông tin chung của mọi dự án (giống danh bạ tổ chức); tab "Của tôi" giữ dự án
 * mình đang hoặc sắp tham gia. Bộ lọc nằm trên URL; sắp xếp và phân trang phía server.
 */
export function ProjectListPage() {
  const t = useTranslations("Projects.List");
  const tFilters = useTranslations("Projects.Filters");
  const tColumns = useTranslations("Projects.Columns");
  const tType = useTranslations("Projects.types");
  const tStatus = useTranslations("Projects.statuses");
  const { user } = useCurrentUser();
  const { filters, updateFilters } = useProjectFilters();
  const departments = useOrgDepartments();
  const offices = useOrgOffices();
  const scope = useProjectCreateScope();
  const [createOpen, setCreateOpen] = useState(false);

  // Ô tìm kiếm giữ chữ đang gõ; chờ 300ms mới ghi lên URL.
  const [keyword, setKeyword] = useState(filters.q ?? "");
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  useEffect(() => {
    if ((debouncedKeyword || undefined) !== filters.q) updateFilters({ q: debouncedKeyword || undefined });
  }, [debouncedKeyword, filters.q, updateFilters]);

  const tableState = useDataTableState();
  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useProjects(filters, tableState.pageParams);
  const today = todayIsoDate();

  // Id cột trùng field của entity Project để sắp xếp ở backend; các cột còn lại không phải field sắp được.
  const columns = useMemo(() => {
    const col = createDataTableColumns<ProjectListItem>();
    return col.columns([
      col.accessor("code", {
        header: tColumns("project"),
        cell: (c) => {
          const project = c.row.original;
          return (
            <span className="block min-w-48">
              <Link href={`/projects/${project.code}`} className="block font-medium hover:underline">
                {project.name}
              </Link>
              <span className="flex items-center gap-2 pt-0.5">
                <span className="font-mono text-xs text-muted-foreground">{project.code}</span>
                {project.myRole && <ProjectRoleBadge role={project.myRole} />}
              </span>
            </span>
          );
        },
      }),
      col.accessor("type", {
        header: tColumns("type"),
        enableSorting: false,
        cell: (c) => (
          <span className="block">
            <span className="block">{tType(c.getValue())}</span>
            {c.row.original.billable && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BanknoteIcon className="size-3.5" aria-hidden /> {tColumns("billable")}
              </span>
            )}
          </span>
        ),
      }),
      col.accessor("ownerDepartment", {
        header: tColumns("owner"),
        enableSorting: false,
        cell: (c) => (
          <span className="block">
            <span className="block">{c.getValue()?.name ?? "—"}</span>
            <span className="block text-xs text-muted-foreground">{c.row.original.office?.name ?? "—"}</span>
          </span>
        ),
      }),
      col.accessor("pm", {
        header: tColumns("pm"),
        enableSorting: false,
        cell: (c) => {
          const pm = c.getValue();
          if (!pm) return "—";
          return (
            <span className="flex items-center gap-2">
              <UserAvatar name={pm.fullName} seed={pm.id} size="sm" />
              <span className="whitespace-nowrap">{pm.fullName}</span>
            </span>
          );
        },
      }),
      col.accessor("startDate", {
        header: tColumns("period"),
        cell: (c) => (
          <span className="block whitespace-nowrap">
            <time dateTime={c.getValue()}>{formatDate(c.getValue())}</time>
            <span className="block text-xs text-muted-foreground">
              {c.row.original.endDate ? (
                <time dateTime={c.row.original.endDate}>{formatDate(c.row.original.endDate)}</time>
              ) : (
                tColumns("noEndDate")
              )}
            </span>
          </span>
        ),
      }),
      col.accessor("memberCount", {
        header: tColumns("people"),
        enableSorting: false,
        cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      }),
      col.accessor("status", {
        header: tColumns("status"),
        cell: (c) => <ProjectStatusBadge project={c.row.original} today={today} />,
      }),
    ]);
  }, [tColumns, tType, today]);

  const unitChoices = (units: { id: string; name: string }[] | undefined) =>
    (units ?? []).map((unit) => ({ value: unit.id, label: unit.name }));
  const filtered = Boolean(filters.q || filters.status || filters.type || filters.departmentId || filters.officeId);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreateProject(scope.data) && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon /> {t("create")}
            </Button>
          )
        }
      />

      {/* Tài khoản không có hồ sơ nhân viên (Admin) không tham gia dự án nào */}
      {user?.employeeId && (
        <Tabs
          value={filters.mine ? "mine" : "all"}
          onValueChange={(value) => updateFilters({ mine: value === "mine" || undefined })}
        >
          <TabsList aria-label={tFilters("scope")}>
            <TabsTrigger value="all">{tFilters("all")}</TabsTrigger>
            <TabsTrigger value="mine">{tFilters("mine")}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={tFilters("search")}
            aria-label={tFilters("search")}
            className="bg-card pl-8"
          />
        </div>
        <ChoiceSelect
          value={filters.status ?? ""}
          onChange={(value) => updateFilters({ status: (value || undefined) as ProjectStatus | undefined })}
          choices={PROJECT_STATUSES.map((status) => ({ value: status, label: tStatus(status) }))}
          noneLabel={tFilters("allStatuses")}
          ariaLabel={tFilters("status")}
          className="bg-card sm:w-40"
        />
        <ChoiceSelect
          value={filters.type ?? ""}
          onChange={(value) => updateFilters({ type: (value || undefined) as ProjectType | undefined })}
          choices={PROJECT_TYPES.map((type) => ({ value: type, label: tType(type) }))}
          noneLabel={tFilters("allTypes")}
          ariaLabel={tFilters("type")}
          className="bg-card sm:w-44"
        />
        <ChoiceSelect
          value={filters.departmentId ?? ""}
          onChange={(value) => updateFilters({ departmentId: value || undefined })}
          choices={unitChoices(departments.data)}
          noneLabel={tFilters("allDepartments")}
          ariaLabel={tFilters("department")}
          className="bg-card sm:w-52"
        />
        <ChoiceSelect
          value={filters.officeId ?? ""}
          onChange={(value) => updateFilters({ officeId: value || undefined })}
          choices={unitChoices(offices.data)}
          noneLabel={tFilters("allOffices")}
          ariaLabel={tFilters("office")}
          className="bg-card sm:w-40"
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword("");
              updateFilters({ q: undefined, status: undefined, type: undefined, departmentId: undefined, officeId: undefined });
            }}
          >
            <XIcon /> {tFilters("clear")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        query={query}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            title={filtered ? t("noMatch") : filters.mine ? t("emptyMine") : t("empty")}
            description={filtered || filters.mine ? undefined : t("emptyHint")}
          />
        }
        {...tableState.bind}
      />

      {canCreateProject(scope.data) && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
