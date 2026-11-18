"use client";

import type { ReactNode } from "react";
import { Building2Icon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { isVacantTeam, splitTeams } from "../rules";
import type { OrgChartDepartment, OrgChartPerson, OrgChartTeam, OrgNode } from "../types";
import { DIAGRAM_INTERACTIVE, OrgDiagram, UnitCard, UnitTile } from "./org-diagram";

/** Một cột phòng vẽ tối đa chừng này dòng; nhiều team hơn thì có dòng "+N team khác" (bấm để mở phòng). */
const MAX_COLUMN_TEAMS = 6;

/** Khung nhẹ của một team trong cột phòng: mảnh, nền trắng, không bóng, để ô phòng phía trên vẫn là cấp nổi hơn. */
const TEAM_FRAME = "flex min-w-0 flex-1 rounded-lg border bg-card px-2 py-1.5 text-left text-sm";

type CompanyDiagramProps = {
  director: OrgChartPerson | null;
  /** Ban Giám đốc của cây đang xem; xem theo văn phòng thì có thể không có ai của Ban ở văn phòng đó. */
  executive?: OrgChartDepartment;
  /** Các phòng còn lại, theo thứ tự backend trả. */
  departments: OrgChartDepartment[];
  onSelect: (node: OrgNode) => void;
  label: string;
};

/**
 * Sơ đồ ba tầng của cả công ty hoặc một văn phòng: giám đốc → các phòng → team của từng phòng xếp dọc dưới phòng. Nhìn một
 * lần thấy cả cơ cấu; bấm phòng, team hay "Trực thuộc phòng" để mở đơn vị đó. Bố cục (một hàng, lưới, xếp dọc trên điện
 * thoại) do `OrgDiagram` lo; cột phòng tự giãn khi còn chỗ.
 */
export function CompanyDiagram({ director, executive, departments, onSelect, label }: CompanyDiagramProps) {
  const roles = useTranslations("Organization.Roles");
  return (
    <OrgDiagram
      stretch
      label={label}
      root={
        <UnitCard
          apex
          person={director}
          role={roles("director")}
          unit={executive?.name}
          count={executive?.employeeCount}
          onClick={executive ? () => onSelect({ kind: "department", id: executive.id }) : undefined}
        />
      }
      items={departments.map((department) => ({
        key: department.id,
        node: <DepartmentColumn department={department} onSelect={onSelect} />,
      }))}
    />
  );
}

/** Ô phòng và bên dưới là các team, dòng "+N team khác" và nhóm "Trực thuộc phòng", nối bằng đường nhánh. */
function DepartmentColumn({ department, onSelect }: { department: OrgChartDepartment; onSelect: (node: OrgNode) => void }) {
  const roles = useTranslations("Organization.Roles");
  const tTree = useTranslations("Organization.Tree");
  const tDiagram = useTranslations("Organization.Diagram");
  const { shown, more } = splitTeams(department.teams, MAX_COLUMN_TEAMS);
  const openDepartment = () => onSelect({ kind: "department", id: department.id });

  const rows: { key: string; node: ReactNode }[] = shown.map((team) => ({
    key: team.id,
    node: <TeamFrame team={team} onSelect={() => onSelect({ kind: "team", id: team.id })} />,
  }));
  if (more > 0) {
    rows.push({
      key: "more",
      node: (
        <button
          type="button"
          onClick={openDepartment}
          className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {tDiagram("moreTeams", { count: more })}
        </button>
      ),
    });
  }
  // Như sơ đồ phòng: trưởng phòng đã ở ô trên nên đếm directStaffCount; phòng không có team thì ô phòng đã là cả nhóm này
  const directStaff = department.teams.length > 0 ? (department.directStaffCount ?? 0) : 0;
  if (directStaff > 0) {
    rows.push({
      key: "no-team",
      node: (
        <DirectStaffFrame
          label={tTree("withoutTeam")}
          count={directStaff}
          onClick={() => onSelect({ kind: "noTeam", departmentId: department.id })}
        />
      ),
    });
  }

  return (
    <div className="flex w-full flex-col">
      <UnitTile
        className="w-full"
        icon={Building2Icon}
        name={department.name}
        count={department.employeeCount}
        person={department.head}
        role={roles("departmentHead")}
        onClick={openDepartment}
      />
      {rows.length > 0 && (
        // Đường nhánh đi xuống dưới ô icon của phòng. Mỗi dòng tự vẽ đoạn dọc (dòng cuối chỉ tới giữa dòng) và một nhánh
        // ngang là phần tử thật được flex căn giữa, nên nhánh luôn chạm giữa khung dù tên team dài một hay hai dòng
        <ul className="ml-4">
          {rows.map((row) => (
            <li
              key={row.key}
              className="relative flex items-center py-1 before:absolute before:top-0 before:left-0 before:h-full before:w-0.5 before:bg-diagram-line last:before:h-1/2"
            >
              <span className="h-0.5 w-2 shrink-0 bg-diagram-line" aria-hidden />
              {row.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Một team trong cột phòng: khung nhẹ, tên ở trên, số người và dấu cảnh báo (chưa có trưởng) ở dưới, ảnh trưởng team bên
 * phải. Chưa có trưởng thì viền nét đứt cam như ô trống ở các sơ đồ khác. Team ngoài phạm vi xem chữ xám, không có số;
 * trưởng team vẫn hiện nếu người xem thấy được người đó (backend quyết định).
 */
function TeamFrame({ team, onSelect }: { team: OrgChartTeam; onSelect: () => void }) {
  const tDiagram = useTranslations("Organization.Diagram");
  const tDetail = useTranslations("Organization.Detail");
  const vacant = isVacantTeam(team);
  return (
    <button
      type="button"
      onClick={onSelect}
      title={team.name}
      className={cn(
        TEAM_FRAME,
        "items-center gap-1.5",
        vacant && "border-dashed border-warning/50",
        team.restricted && "text-muted-foreground",
        DIAGRAM_INTERACTIVE,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 leading-snug">{team.name}</span>
        {(team.employeeCount != null || vacant) && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {team.employeeCount != null && <span className="tabular-nums">{tDetail("people", { count: team.employeeCount })}</span>}
            {vacant && (
              <>
                <TriangleAlertIcon className="size-3 shrink-0 text-warning" aria-hidden />
                <span className="sr-only">{tDiagram("vacant")}</span>
              </>
            )}
          </span>
        )}
      </span>
      {team.lead && <UserAvatar name={team.lead.fullName} seed={team.lead.employeeCode} size="sm" />}
    </button>
  );
}

/** Nhóm "Trực thuộc phòng": cùng khung với team nhưng nét đứt, chữ xám, vì không phải một đơn vị thật. */
function DirectStaffFrame({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  const tDetail = useTranslations("Organization.Detail");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(TEAM_FRAME, "flex-col border-dashed text-muted-foreground hover:text-foreground", DIAGRAM_INTERACTIVE)}
    >
      <span className="truncate leading-snug">{label}</span>
      <span className="text-xs tabular-nums">{tDetail("people", { count })}</span>
    </button>
  );
}
