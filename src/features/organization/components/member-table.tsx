"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useOrgMembers } from "../hooks";
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
  /** Bấm tên đơn vị trong cột "Đơn vị" để chọn đơn vị đó trên cây. */
  onSelectUnit?: (node: OrgNode) => void;
  emptyTitle: string;
  emptyDescription?: string;
};

/** Người của một nút trên cây. Thứ tự do backend: trưởng phòng, trưởng team, rồi theo tên tiếng Việt. */
export function MemberTable({ filters, unitColumn, showOffice = true, onSelectUnit, emptyTitle, emptyDescription }: MemberTableProps) {
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
                  <span className="font-medium">{member.fullName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{member.employeeCode}</span>
                  {member.departmentHead && <Badge variant="info">{t("departmentHead")}</Badge>}
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
              cell: (c) => <UnitCell member={c.row.original} onSelectUnit={onSelectUnit} />,
            }),
          ]
        : []),
      ...(unitColumn === "team"
        ? [
            col.accessor((row) => row.team?.name ?? "", {
              id: "team",
              header: t("team"),
              cell: (c) => <TeamCell member={c.row.original} onSelectUnit={onSelectUnit} />,
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
  }, [t, unitColumn, showOffice, onSelectUnit]);

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

function UnitCell({ member, onSelectUnit }: { member: OrgChartMember; onSelectUnit?: (node: OrgNode) => void }) {
  const t = useTranslations("Organization.Members");
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
        {team ? link(team.name, { kind: "team", id: team.id }) : t("noTeam")}
      </span>
    </span>
  );
}

function TeamCell({ member, onSelectUnit }: { member: OrgChartMember; onSelectUnit?: (node: OrgNode) => void }) {
  const t = useTranslations("Organization.Members");
  const { team } = member;
  if (!team) return <span className="text-muted-foreground">{t("noTeam")}</span>;
  if (!onSelectUnit) return <span>{team.name}</span>;
  return (
    <button type="button" onClick={() => onSelectUnit({ kind: "team", id: team.id })} className="text-left hover:text-primary hover:underline">
      {team.name}
    </button>
  );
}
