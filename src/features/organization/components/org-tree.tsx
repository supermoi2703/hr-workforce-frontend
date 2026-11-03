"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Building2Icon, ChevronRightIcon, LandmarkIcon, NetworkIcon, UserRoundIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { sameNode } from "../rules";
import type { OrgChartDepartment, OrgNode } from "../types";

type OrgTreeProps = {
  /** Gốc của cây: "Toàn công ty" hoặc tên văn phòng đang xem. */
  rootLabel: string;
  rootCount: number;
  departments: OrgChartDepartment[];
  selected?: OrgNode;
  onSelect: (node: OrgNode | undefined) => void;
  /** Đang lọc theo tên đơn vị: mở hết các phòng để thấy team khớp. */
  expandAll?: boolean;
};

/**
 * Cây phòng ban → team (kiểu cây "Cơ cấu tổ chức" của các phần mềm nhân sự). Phòng đang chứa nút được chọn tự mở.
 * Mỗi dòng là một nút bấm thường (Tab để đi qua), nút mũi tên bên trái chỉ để mở / đóng. Bàn phím như cây chuẩn:
 * lên / xuống chuyển dòng, Home / End về đầu / cuối, phải mở phòng (hoặc vào team đầu tiên), trái thu gọn (hoặc về phòng).
 */
export function OrgTree({ rootLabel, rootCount, departments, selected, onSelect, expandAll }: OrgTreeProps) {
  const t = useTranslations("Organization.Tree");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const selectedDepartmentId =
    selected?.kind === "department"
      ? selected.id
      : selected?.kind === "noTeam"
        ? selected.departmentId
        : departments.find((d) => d.teams.some((team) => selected?.kind === "team" && team.id === selected.id))?.id;

  const isOpen = (department: OrgChartDepartment) =>
    expandAll || (toggled[department.id] ?? department.id === selectedDepartmentId);
  const setOpen = (departmentId: string, open: boolean) => setToggled((current) => ({ ...current, [departmentId]: open }));

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const row = event.target as HTMLElement;
    if (!row.matches("[data-tree-row]")) return;
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-tree-row]"));
    const index = rows.indexOf(row);
    const focusAt = (i: number) => rows[Math.max(0, Math.min(rows.length - 1, i))]?.focus();
    const { level, departmentId } = row.dataset;
    const department = departments.find((d) => d.id === departmentId);
    const expandable = level === "1" && !!department && department.teams.length > 0;

    switch (event.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(rows.length - 1);
        break;
      case "ArrowRight":
        if (!expandable || !department) return;
        if (isOpen(department)) focusAt(index + 1);
        else setOpen(department.id, true);
        break;
      case "ArrowLeft":
        if (expandable && department && isOpen(department)) setOpen(department.id, false);
        else if (level === "2") rows.find((r) => r.dataset.level === "1" && r.dataset.departmentId === departmentId)?.focus();
        else return;
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <nav aria-label={t("label")} className="text-sm" onKeyDown={handleKeyDown}>
      <TreeRow
        level={0}
        icon={<NetworkIcon />}
        label={rootLabel}
        count={rootCount}
        active={!selected}
        onClick={() => onSelect(undefined)}
        strong
      />
      <ul className="mt-1 space-y-0.5">
        {departments.map((department) => {
          const open = isOpen(department);
          // Phòng không có team thì nút "trực thuộc phòng" trùng với chính phòng đó: không hiện
          const hasChildren = department.teams.length > 0;
          return (
            <li key={department.id}>
              <TreeRow
                level={1}
                departmentId={department.id}
                icon={department.executive ? <LandmarkIcon /> : <Building2Icon />}
                label={department.name}
                hint={department.code}
                count={department.employeeCount}
                active={sameNode(selected, { kind: "department", id: department.id })}
                onClick={() => onSelect({ kind: "department", id: department.id })}
                toggle={
                  hasChildren
                    ? {
                        open,
                        label: t(open ? "collapse" : "expand", { name: department.name }),
                        onToggle: () => setOpen(department.id, !open),
                      }
                    : undefined
                }
              />
              {hasChildren && open && (
                <ul className="space-y-0.5">
                  {department.teams.map((team) => (
                    <li key={team.id}>
                      <TreeRow
                        level={2}
                        departmentId={department.id}
                        icon={<UsersRoundIcon />}
                        label={team.name}
                        hint={team.code}
                        count={team.employeeCount}
                        active={sameNode(selected, { kind: "team", id: team.id })}
                        onClick={() => onSelect({ kind: "team", id: team.id })}
                      />
                    </li>
                  ))}
                  {department.withoutTeamCount > 0 && (
                    <li>
                      <TreeRow
                        level={2}
                        departmentId={department.id}
                        icon={<UserRoundIcon />}
                        label={t("withoutTeam")}
                        count={department.withoutTeamCount}
                        active={sameNode(selected, { kind: "noTeam", departmentId: department.id })}
                        onClick={() => onSelect({ kind: "noTeam", departmentId: department.id })}
                        muted
                      />
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type TreeRowProps = {
  level: 0 | 1 | 2;
  /** Phòng của dòng (cấp 1, 2), để phím trái quay về đúng phòng cha. */
  departmentId?: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  count: number;
  active: boolean;
  onClick: () => void;
  toggle?: { open: boolean; label: string; onToggle: () => void };
  strong?: boolean;
  muted?: boolean;
};

function TreeRow({ level, departmentId, icon, label, hint, count, active, onClick, toggle, strong, muted }: TreeRowProps) {
  return (
    <div
      className={cn(
        "group/row relative flex items-center rounded-md",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted",
        // Đường dọc nối team với phòng cha, thẳng dưới icon của phòng (cột mũi tên 1.5rem + nửa icon 0.5rem)
        level === 2 && "before:absolute before:inset-y-0 before:left-8 before:border-l before:border-border",
      )}
    >
      <span className={cn("flex w-6 shrink-0 justify-center", level === 2 && "ml-6")}>
        {toggle && (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-expanded={toggle.open}
            aria-label={toggle.label}
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronRightIcon className={cn("size-3.5 transition-transform", toggle.open && "rotate-90")} aria-hidden />
          </button>
        )}
      </span>
      <button
        type="button"
        onClick={onClick}
        data-tree-row
        data-level={level}
        data-department-id={departmentId}
        aria-current={active ? "true" : undefined}
        title={hint ? `${label} (${hint})` : label}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          strong && "font-semibold",
          !strong && active && "font-medium",
          muted && !active && "text-muted-foreground",
        )}
      >
        <span
          className={cn("shrink-0 [&_svg]:size-4", active ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 text-xs tabular-nums",
            active ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </button>
    </div>
  );
}
