"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useOrgMembers } from "../hooks";
import { useOpenPerson } from "./person-sheet";
import type { MemberFilters, OrgChartMember, OrgNode } from "../types";

type MemberTableProps = {
  filters: MemberFilters;
  /**
   * Cột đơn vị: "full" = phòng ban + team (danh sách trộn nhiều phòng: toàn công ty, văn phòng, kết quả tìm);
   * "team" = chỉ team (đang xem một phòng); "none" = không cần (đang xem một team).
   */
  unitColumn: "full" | "team" | "none";
  /** Ẩn cột văn phòng khi cả danh sách cùng một văn phòng. */
  showOffice?: boolean;
  /** employees.id của giám đốc: hiện "Giám đốc" thay cho "Trưởng phòng" (giám đốc là trưởng Ban Giám đốc). */
  directorId?: string;
  /** Bấm tên đơn vị trong cột "Đơn vị" để chọn đơn vị đó trên cây. */
  onSelectUnit?: (node: OrgNode) => void;
  emptyTitle: string;
  emptyDescription?: string;
};

/** Người của một nút trên cây. Thứ tự do backend: trưởng phòng, trưởng team, rồi theo tên tiếng Việt. */
export function MemberTable({
  filters,
  unitColumn,
  showOffice = true,
  directorId,
  onSelectUnit,
  emptyTitle,
  emptyDescription,
}: MemberTableProps) {
  const t = useTranslations("Organization.Members");
  const tableState = useDataTableState({ pageSize: 20 });

  // Đổi nút / từ khóa thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const filterKey = JSON.stringify(filters);
  const [prevKey, setPrevKey] = useState(filterKey);
  if (prevKey !== filterKey) {
    setPrevKey(filterKey);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useOrgMembers(filters, tableState.pageParams);
  const openPerson = useOpenPerson();

  const columns = useMemo(() => {
    const col = createDataTableColumns<OrgChartMember>();
    return col.columns([
      col.accessor("fullName", {
        header: t("employee"),
        cell: (c) => {
          const member = c.row.original;
          return (
            <span className="flex items-center gap-3">
              <UserAvatar name={member.fullName} seed={member.employeeCode} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <button
                    type="button"
                    onClick={() => openPerson(member)}
                    className="text-left font-medium hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {member.fullName}
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">{member.employeeCode}</span>
                  {member.departmentHead && (
                    <Badge variant="info">{member.id === directorId ? t("director") : t("departmentHead")}</Badge>
                  )}
                  {member.teamLead && <Badge variant="secondary">{t("teamLead")}</Badge>}
                </span>
                <a
                  href={`mailto:${member.workEmail}`}
                  className="w-fit max-w-64 truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {member.workEmail}
                </a>
              </span>
            </span>
          );
        },
      }),
      col.accessor((row) => row.position?.name ?? "", {
        id: "position",
        header: t("position"),
        cell: (c) => c.getValue() || <span className="text-muted-foreground">—</span>,
      }),
      ...(unitColumn === "full"
        ? [
            col.accessor((row) => row.department?.name ?? "", {
              id: "unit",
              header: t("unit"),
              cell: (c) => <UnitCell member={c.row.original} directorId={directorId} onSelectUnit={onSelectUnit} />,
            }),
          ]
        : []),
      ...(unitColumn === "team"
        ? [
            col.accessor((row) => row.team?.name ?? "", {
              id: "team",
              header: t("team"),
              cell: (c) => <TeamCell member={c.row.original} directorId={directorId} onSelectUnit={onSelectUnit} />,
            }),
          ]
        : []),
      ...(showOffice
        ? [
            col.accessor((row) => row.office?.name ?? "", {
              id: "office",
              header: t("office"),
              cell: (c) => c.getValue() || <span className="text-muted-foreground">—</span>,
            }),
          ]
        : []),
    ]);
  }, [t, unitColumn, showOffice, directorId, onSelectUnit, openPerson]);

  return (
    <DataTable
      columns={columns}
      query={query}
      getRowId={(row) => row.id}
      pageSizeOptions={[20, 50, 100]}
      empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      {...tableState.bind}
      onSortingChange={undefined}
    />
  );
}

type CellProps = { member: OrgChartMember; directorId?: string; onSelectUnit?: (node: OrgNode) => void };

/**
 * Người không thuộc team: trưởng phòng / giám đốc hiện đúng vai trò; người khác là "Trực thuộc phòng" (làm việc trực
 * tiếp ở cấp phòng, không phải "chưa được xếp").
 */
function NoTeamLabel({ member, directorId }: Omit<CellProps, "onSelectUnit">) {
  const t = useTranslations("Organization.Members");
  if (member.departmentHead) return <>{member.id === directorId ? t("director") : t("departmentHead")}</>;
  return <>{t("noTeam")}</>;
}

function UnitCell({ member, directorId, onSelectUnit }: CellProps) {
  const { department, team } = member;
  if (!department) return <span className="text-muted-foreground">—</span>;
  const link = (label: string, node: OrgNode) =>
    onSelectUnit ? (
      <button type="button" onClick={() => onSelectUnit(node)} className="text-left hover:text-primary hover:underline">
        {label}
      </button>
    ) : (
      <span>{label}</span>
    );
  return (
    <span className="flex flex-col">
      {link(department.name, { kind: "department", id: department.id })}
      <span className="text-xs text-muted-foreground">
        {team ? link(team.name, { kind: "team", id: team.id }) : <NoTeamLabel member={member} directorId={directorId} />}
      </span>
    </span>
  );
}

function TeamCell({ member, directorId, onSelectUnit }: CellProps) {
  const { team } = member;
  if (!team) {
    return (
      <span className="text-muted-foreground">
        <NoTeamLabel member={member} directorId={directorId} />
      </span>
    );
  }
  if (!onSelectUnit) return <span>{team.name}</span>;
  return (
    <button type="button" onClick={() => onSelectUnit({ kind: "team", id: team.id })} className="text-left hover:text-primary hover:underline">
      {team.name}
    </button>
  );
}
