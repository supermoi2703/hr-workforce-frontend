"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { useOrgMembers } from "../hooks";
import { foldText, leaderRoles } from "../rules";
import type { MemberFilters, OrgChartMember, OrgNode } from "../types";
import { useOpenPerson } from "./person-sheet";
import { RoleChip } from "./role-chip";

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

/** Link chữ trong bảng: màu chữ thường, gạch chân khi rê chuột hoặc focus (không tô màu xanh để giữ một tông với trang). */
const TEXT_LINK =
  "rounded-sm text-left underline-offset-4 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Người của một nút trên cây. Thứ tự do backend: trưởng phòng, trưởng team, rồi theo tên tiếng Việt. Bấm cả dòng (hoặc
 * tên, cho người dùng bàn phím) để mở khung thông tin người; dấu › cuối dòng báo là bấm được.
 */
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
        cell: (c) => <PersonCell member={c.row.original} onOpen={openPerson} />,
      }),
      col.accessor((row) => row.position?.name ?? "", {
        id: "position",
        header: t("position"),
        cell: (c) => <PositionCell member={c.row.original} directorId={directorId} />,
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
              cell: (c) => c.getValue() || <Dash />,
            }),
          ]
        : []),
      // Dấu › báo cả dòng bấm được; đậm lên khi rê chuột qua dòng
      col.display({
        id: "open",
        header: "",
        cell: () => (
          <ChevronRightIcon
            className="size-4 text-muted-foreground/60 transition-colors group-hover/row:text-foreground"
            aria-hidden
          />
        ),
      }),
    ]);
  }, [t, unitColumn, showOffice, directorId, onSelectUnit, openPerson]);

  return (
    <DataTable
      columns={columns}
      query={query}
      getRowId={(row) => row.id}
      pageSizeOptions={[20, 50, 100]}
      empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      onRowClick={openPerson}
      {...tableState.bind}
      onSortingChange={undefined}
    />
  );
}

/**
 * Ô nhân viên: ảnh, tên, dòng dưới là mã và email. Tên là nút thật để người dùng bàn phím mở được khung thông tin. Vai
 * trò trưởng nằm ở cột chức vụ (chip), ảnh không tô riêng.
 */
function PersonCell({ member, onOpen }: { member: OrgChartMember; onOpen: (member: OrgChartMember) => void }) {
  return (
    <span className="flex items-center gap-3">
      <UserAvatar name={member.fullName} seed={member.employeeCode} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <button type="button" onClick={() => onOpen(member)} className={cn(TEXT_LINK, "w-fit font-medium text-foreground")}>
          {member.fullName}
        </button>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{member.employeeCode}</span>
          <a href={`mailto:${member.workEmail}`} className={cn(TEXT_LINK, "max-w-64 truncate hover:text-foreground")}>
            {member.workEmail}
          </a>
        </span>
      </span>
    </span>
  );
}

/**
 * Chức vụ và chip vai trò trưởng. Chức vụ trùng tên vai trò (vd chức vụ "Trưởng phòng" của một trưởng phòng) thì chỉ hiện
 * chip, không lặp chữ.
 */
function PositionCell({ member, directorId }: { member: OrgChartMember; directorId?: string }) {
  const t = useTranslations("Organization.Members");
  const roles = leaderRoles(member, directorId);
  const position = member.position?.name;
  const showPosition = !!position && !roles.some((role) => foldText(t(role)) === foldText(position));
  if (!showPosition && roles.length === 0) return <Dash />;
  return (
    <span className="flex flex-col items-start gap-1">
      {showPosition && <span>{position}</span>}
      {roles.map((role) => (
        <RoleChip key={role} role={role} />
      ))}
    </span>
  );
}

type CellProps = { member: OrgChartMember; onSelectUnit?: (node: OrgNode) => void };

/** Tên đơn vị: bấm để chọn đơn vị đó trên cây (nếu trang cho chọn). */
function UnitLink({ label, node, onSelectUnit }: { label: string; node: OrgNode; onSelectUnit?: (node: OrgNode) => void }) {
  if (!onSelectUnit) return <span>{label}</span>;
  return (
    <button type="button" onClick={() => onSelectUnit(node)} className={TEXT_LINK}>
      {label}
    </button>
  );
}

/**
 * Phòng ban, dưới là team (chữ nhỏ, xám). Người không thuộc team là "Trực thuộc phòng"; trưởng phòng và giám đốc không ghi
 * dòng này vì chip ở cột chức vụ đã nói vai trò. Không icon: tiêu đề cột và cỡ chữ đã phân biệt phòng với team (như bảng
 * kết quả tìm người ở trang Kỹ năng).
 */
function UnitCell({ member, onSelectUnit }: CellProps) {
  const t = useTranslations("Organization.Members");
  const { department, team } = member;
  if (!department) return <Dash />;
  return (
    // Tên phòng dài được xuống dòng, để bảng vừa khung thay vì cuộn ngang
    <span className="flex min-w-36 flex-col gap-0.5 whitespace-normal">
      <span>
        <UnitLink label={department.name} node={{ kind: "department", id: department.id }} onSelectUnit={onSelectUnit} />
      </span>
      {team ? (
        <span className={SUB_LINE}>
          <UnitLink label={team.name} node={{ kind: "team", id: team.id }} onSelectUnit={onSelectUnit} />
        </span>
      ) : (
        !member.departmentHead && <span className={SUB_LINE}>{t("noTeam")}</span>
      )}
    </span>
  );
}

/** Cột team khi đang xem một phòng: trưởng phòng không thuộc team thì để "—" (chip ở cột chức vụ đã nói vai trò). */
function TeamCell({ member, onSelectUnit }: CellProps) {
  const t = useTranslations("Organization.Members");
  const { team } = member;
  if (team) {
    return (
      <span className="whitespace-normal">
        <UnitLink label={team.name} node={{ kind: "team", id: team.id }} onSelectUnit={onSelectUnit} />
      </span>
    );
  }
  if (member.departmentHead) return <Dash />;
  return <span className="text-muted-foreground">{t("noTeam")}</span>;
}

/** Dòng phụ dưới tên phòng: team hoặc "Trực thuộc phòng". */
const SUB_LINE = "text-xs text-muted-foreground";

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}
