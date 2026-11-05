"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { useEmployeeFilters, useEmployees, useOrgUnits } from "../hooks";
import { teamsOf } from "../rules";
import { EMPLOYEE_STATUSES, type EmployeeListItem, type EmployeeStatus, type OrgUnit } from "../types";
import { ChoiceSelect } from "./choice-select";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeStatusBadge } from "./employee-status-badge";

/**
 * Danh sách hồ sơ trong phạm vi dữ liệu (HR văn phòng: văn phòng mình, Manager: đội, HR công ty / Admin: tất cả).
 * Bộ lọc nằm trên URL; sắp xếp và phân trang phía server.
 */
export function EmployeeListPage() {
  const t = useTranslations("Employees");
  const tStatus = useTranslations("Employees.statuses");
  const tLevel = useTranslations("Employees.levels");
  const { hasPermission } = useCurrentUser();
  const org = useOrgUnits();
  const { filters, updateFilters } = useEmployeeFilters();
  const [createOpen, setCreateOpen] = useState(false);

  // Ô tìm kiếm giữ chữ đang gõ; chờ 300ms mới ghi lên URL.
  const [keyword, setKeyword] = useState(filters.keyword ?? "");
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  useEffect(() => {
    if ((debouncedKeyword || undefined) !== filters.keyword) updateFilters({ keyword: debouncedKeyword || undefined });
  }, [debouncedKeyword, filters.keyword, updateFilters]);

  const tableState = useDataTableState();
  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn tồn tại trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useEmployees(filters, tableState.pageParams);
  const { lookup } = org;

  // Id cột trùng field backend cho phép sắp xếp (employeeCode, fullName, hireDate).
  const columns = useMemo(() => {
    const col = createDataTableColumns<EmployeeListItem>();
    return col.columns([
      col.accessor("fullName", {
        header: t("Columns.employee"),
        cell: (c) => {
          const employee = c.row.original;
          return (
            <span className="flex min-w-0 items-center gap-2.5">
              <UserAvatar name={employee.fullName} seed={employee.id} size="sm" />
              <span className="min-w-0">
                <Link href={`/employees/${employee.id}`} className="block truncate font-medium hover:underline">
                  {employee.fullName}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">{employee.workEmail}</span>
              </span>
            </span>
          );
        },
      }),
      col.accessor("employeeCode", {
        header: t("Columns.code"),
        cell: (c) => <span className="font-mono text-xs tabular-nums">{c.getValue()}</span>,
      }),
      col.accessor("departmentId", {
        header: t("Columns.unit"),
        enableSorting: false,
        cell: (c) => {
          const employee = c.row.original;
          const team = lookup.team(employee.teamId);
          return (
            <span className="min-w-0">
              <span className="block truncate">{lookup.department(employee.departmentId)?.name ?? "—"}</span>
              {team && <span className="block truncate text-xs text-muted-foreground">{team.name}</span>}
            </span>
          );
        },
      }),
      col.accessor("positionId", {
        header: t("Columns.position"),
        enableSorting: false,
        cell: (c) => {
          const employee = c.row.original;
          return (
            <span className="min-w-0">
              <span className="block truncate">{lookup.position(employee.positionId)?.name ?? "—"}</span>
              <span className="block truncate text-xs text-muted-foreground">{tLevel(employee.level)}</span>
            </span>
          );
        },
      }),
      col.accessor("status", {
        header: t("Columns.status"),
        enableSorting: false,
        cell: (c) => <EmployeeStatusBadge status={c.getValue()} />,
      }),
      col.accessor("hireDate", {
        header: t("Columns.hireDate"),
        cell: (c) => <time dateTime={c.getValue()}>{formatDate(c.getValue())}</time>,
      }),
      col.accessor("hasAccount", {
        header: t("Columns.account"),
        enableSorting: false,
        cell: (c) =>
          c.getValue() ? (
            t("Columns.hasAccount")
          ) : (
            <span className="text-muted-foreground">{t("Columns.noAccount")}</span>
          ),
      }),
    ]);
  }, [t, tLevel, lookup]);

  const unitChoices = (units: OrgUnit[] | undefined) =>
    (units ?? []).filter((unit) => unit.active).map((unit) => ({ value: unit.id, label: unit.name }));
  const statusChoices = EMPLOYEE_STATUSES.map((status) => ({ value: status, label: tStatus(status) }));
  const filtered = Boolean(filters.keyword || filters.officeId || filters.departmentId || filters.status);

  return (
    <>
      <PageHeader
        title={t("List.title")}
        description={t("List.description")}
        actions={
          hasPermission("employee:manage") && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon /> {t("List.create")}
            </Button>
          )
        }
      />

      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("Filters.search")}
            aria-label={t("Filters.search")}
            className="bg-card pl-8"
          />
        </div>
        <ChoiceSelect
          value={filters.officeId ?? ""}
          onChange={(value) => updateFilters({ officeId: value || undefined })}
          choices={unitChoices(org.offices)}
          noneLabel={t("Filters.allOffices")}
          ariaLabel={t("Filters.office")}
          className="bg-card sm:w-44"
        />
        <ChoiceSelect
          value={filters.departmentId ?? ""}
          // Team phụ thuộc phòng: đổi phòng thì bỏ lọc team.
          onChange={(value) => updateFilters({ departmentId: value || undefined, teamId: undefined })}
          choices={unitChoices(org.departments)}
          noneLabel={t("Filters.allDepartments")}
          ariaLabel={t("Filters.department")}
          className="bg-card sm:w-44"
        />
        {filters.departmentId && teamsOf(org.teams, filters.departmentId).length > 0 && (
          <ChoiceSelect
            value={filters.teamId ?? ""}
            onChange={(value) => updateFilters({ teamId: value || undefined })}
            choices={unitChoices(teamsOf(org.teams, filters.departmentId))}
            noneLabel={t("Filters.allTeams")}
            ariaLabel={t("Filters.team")}
            className="bg-card sm:w-44"
          />
        )}
        <ChoiceSelect
          value={filters.status ?? ""}
          onChange={(value) => updateFilters({ status: (value || undefined) as EmployeeStatus | undefined })}
          choices={statusChoices}
          noneLabel={t("Filters.allStatuses")}
          ariaLabel={t("Filters.status")}
          className="bg-card sm:w-40"
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword("");
              updateFilters({ keyword: undefined, officeId: undefined, departmentId: undefined, teamId: undefined, status: undefined });
            }}
          >
            <XIcon /> {t("Filters.clear")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        query={query}
        getRowId={(row) => row.id}
        empty={<EmptyState title={t("List.empty")} description={filtered ? undefined : t("List.emptyHint")} />}
        {...tableState.bind}
      />

      {hasPermission("employee:manage") && <EmployeeFormDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  );
}
