"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { ClockIcon, PlusIcon, SearchIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { useOrgUnits, useSkillCatalog, useSkillSearch } from "../hooks";
import { MAX_REQUIREMENTS } from "../rules";
import { SKILL_LEVELS, type EmployeeSkill, type Skill, type SkillSearchCriteria, type SkillSearchResult } from "../types";
import { EmployeeSkillsSheet, type SheetPerson } from "./employee-skills-sheet";
import { PersonCell, RowChevron } from "./person-cell";
import { LevelMeter } from "./skill-level";
import { SkillPicker } from "./skill-picker";

/** Số kỹ năng tối đa còn hiện mỗi kỹ năng một cột trong bảng kết quả. */
const PER_SKILL_COLUMNS = 4;

/** Giá trị "không lọc" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const ALL = "all";

type SkillSearchProps = {
  criteria: SkillSearchCriteria;
  onChange: (criteria: SkillSearchCriteria) => void;
};

/**
 * Tab "Tìm người" (skill:read): người đang làm việc đạt MỌI yêu cầu, trên toàn công ty. Mặc định tính cả mức chưa xác
 * nhận (ghi rõ trên kết quả); có thể chỉ tính mức đã xác nhận. Điều kiện nằm trên URL để gửi link cho người khác.
 */
export function SkillSearch({ criteria, onChange }: SkillSearchProps) {
  const t = useTranslations("Skills.Search");
  const catalog = useSkillCatalog();
  const units = useOrgUnits();
  const tableState = useDataTableState({ pageSize: 20 });
  const [person, setPerson] = useState<SheetPerson | null>(null);

  // Đổi điều kiện thì về trang đầu.
  const criteriaKey = JSON.stringify(criteria);
  const [prevKey, setPrevKey] = useState(criteriaKey);
  if (prevKey !== criteriaKey) {
    setPrevKey(criteriaKey);
    if (tableState.pagination.pageIndex !== 0) tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
  }

  const query = useSkillSearch(criteria, tableState.pageParams);
  const skills = useMemo(() => catalog.data ?? [], [catalog.data]);
  const byCode = useMemo(() => new Map(skills.map((s) => [s.code, s])), [skills]);
  const chosen = useMemo(
    () => new Map(criteria.requirements.map((r) => [byCode.get(r.code)?.id ?? r.code, t("alreadyChosen")])),
    [criteria.requirements, byCode, t],
  );

  const department = units.departments.find((d) => d.id === criteria.departmentId);

  function addRequirement(skill: Skill) {
    onChange({ ...criteria, requirements: [...criteria.requirements, { code: skill.code, minLevel: 1 }] });
  }
  function setMinLevel(code: string, minLevel: number) {
    onChange({ ...criteria, requirements: criteria.requirements.map((r) => (r.code === code ? { ...r, minLevel } : r)) });
  }
  function removeRequirement(code: string) {
    onChange({ ...criteria, requirements: criteria.requirements.filter((r) => r.code !== code) });
  }

  const perSkill = criteria.requirements.length <= PER_SKILL_COLUMNS;
  const requirementKey = criteria.requirements.map((r) => r.code).join(",");
  const requirementCodes = useMemo(() => (requirementKey ? requirementKey.split(",") : []), [requirementKey]);

  const columns = useMemo(() => {
    const personOf = (row: SkillSearchResult): SheetPerson => ({
      employeeId: row.employeeId,
      fullName: row.fullName,
      employeeCode: row.employeeCode,
      subtitle: units.nameOf(row.departmentId),
    });
    const col = createDataTableColumns<SkillSearchResult>();
    return col.columns([
      col.accessor("fullName", {
        header: t("employee"),
        cell: (c) => {
          const row = c.row.original;
          return (
            <span className="flex flex-col gap-2">
              <PersonCell
                fullName={row.fullName}
                employeeCode={row.employeeCode}
                extra={row.level && <span>· {t(`employeeLevel.${row.level}`)}</span>}
                onOpen={() => setPerson(personOf(row))}
              />
              <MatchedList skills={row.matchedSkills} className="md:hidden" />
            </span>
          );
        },
      }),
      // Tối đa PER_SKILL_COLUMNS kỹ năng: mỗi kỹ năng một cột, mỗi người đúng một dòng, so sánh theo cột. Nhiều hơn thì một
      // cột gộp. Màn hình hẹp luôn dùng dạng gộp, đặt dưới tên.
      ...(perSkill
        ? requirementCodes.map((code) =>
            col.display({
              id: `skill-${code}`,
              header: byCode.get(code)?.name ?? code,
              meta: { className: "hidden md:table-cell" },
              cell: (c) => {
                const skill = c.row.original.matchedSkills.find((s) => s.skillCode === code);
                return skill ? <MatchedLevel skill={skill} /> : <span className="text-muted-foreground">—</span>;
              },
            }),
          )
        : [
            col.display({
              id: "matched",
              header: t("matched"),
              meta: { className: "hidden md:table-cell" },
              cell: (c) => <MatchedList skills={c.row.original.matchedSkills} />,
            }),
          ]),
      col.display({
        id: "unit",
        header: t("unit"),
        meta: { className: "hidden md:table-cell" },
        cell: (c) => {
          const row = c.row.original;
          const dept = units.nameOf(row.departmentId);
          const team = units.nameOf(row.teamId);
          return dept ? (
            <span className="flex min-w-36 flex-col gap-0.5 whitespace-normal">
              <span>{dept}</span>
              {team && <span className="text-xs text-muted-foreground">{team}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      }),
      col.display({
        id: "office",
        header: t("office"),
        meta: { className: "hidden lg:table-cell" },
        cell: (c) => {
          const office = units.nameOf(c.row.original.officeId);
          return office ?? <span className="text-muted-foreground">—</span>;
        },
      }),
      col.display({ id: "open", header: "", meta: { className: "w-8" }, cell: () => <RowChevron /> }),
    ]);
  }, [t, units, perSkill, requirementCodes, byCode]);

  const officeItems: Record<string, string> = {
    [ALL]: t("allOffices"),
    ...Object.fromEntries(units.offices.map((o) => [o.id, o.name])),
  };
  const departmentItems: Record<string, string> = {
    [ALL]: t("allDepartments"),
    ...Object.fromEntries(units.departments.map((d) => [d.id, d.name])),
  };
  const teamItems: Record<string, string> = {
    [ALL]: t("allTeams"),
    ...Object.fromEntries((department?.teams ?? []).map((team) => [team.id, team.name])),
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4" aria-label={t("criteria")}>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("requirements")}</h3>
          <p className="text-sm text-muted-foreground">{t("requirementsHint")}</p>
        </div>

        {/* Điều kiện là chip gọn trên một hàng; ô thêm kỹ năng nằm cuối hàng */}
        <div className="flex flex-wrap items-center gap-2">
          {criteria.requirements.map((requirement) => (
            <RequirementChip
              key={requirement.code}
              skill={byCode.get(requirement.code)}
              requirement={requirement}
              onLevelChange={(level) => setMinLevel(requirement.code, level)}
              onRemove={() => removeRequirement(requirement.code)}
            />
          ))}
          {criteria.requirements.length < MAX_REQUIREMENTS ? (
            <AddRequirement skills={skills} disabled={chosen} onAdd={addRequirement} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("maxReached", { max: MAX_REQUIREMENTS })}</p>
          )}
          {criteria.requirements.length >= 2 && (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...criteria, requirements: [] })}>
              {t("clearAll")}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterSelect
            label={t("office")}
            items={officeItems}
            value={criteria.officeId}
            onChange={(officeId) => onChange({ ...criteria, officeId })}
          />
          <FilterSelect
            label={t("department")}
            items={departmentItems}
            value={criteria.departmentId}
            onChange={(departmentId) => onChange({ ...criteria, departmentId, teamId: undefined })}
          />
          {department && department.teams.length > 0 && (
            <FilterSelect label={t("team")} items={teamItems} value={criteria.teamId} onChange={(teamId) => onChange({ ...criteria, teamId })} />
          )}
          <Label className="flex items-center gap-2 text-sm font-normal sm:ml-auto">
            <Checkbox checked={criteria.confirmedOnly} onCheckedChange={(checked) => onChange({ ...criteria, confirmedOnly: !!checked })} />
            {t("confirmedOnly")}
          </Label>
        </div>
      </section>

      {criteria.requirements.length === 0 ? (
        <EmptyState className="border border-dashed py-16" icon={<SearchIcon />} title={t("startTitle")} description={t("start")} />
      ) : (
        <>
          {query.data && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite">
              {t("resultCount", { count: query.data.totalElements })}
              {query.data.totalElements > 0 && !criteria.confirmedOnly && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <ClockIcon className="size-3.5 text-warning" aria-hidden /> {t("unconfirmedHint")}
                </span>
              )}
            </p>
          )}
          <DataTable
            columns={columns}
            query={query}
            getRowId={(row) => row.employeeId}
            pageSizeOptions={[20, 50, 100]}
            empty={<EmptyState icon={<UsersRoundIcon />} title={t("emptyTitle")} description={t("empty")} />}
            onRowClick={(row) =>
              setPerson({ employeeId: row.employeeId, fullName: row.fullName, employeeCode: row.employeeCode, subtitle: units.nameOf(row.departmentId) })
            }
            {...tableState.bind}
            onSortingChange={undefined}
          />
        </>
      )}

      <EmployeeSkillsSheet person={person} onClose={() => setPerson(null)} />
    </div>
  );
}

function AddRequirement({ skills, disabled, onAdd }: { skills: Skill[]; disabled: Map<string, string>; onAdd: (skill: Skill) => void }) {
  const t = useTranslations("Skills.Search");
  return (
    <div className="flex w-full items-center gap-2 sm:w-72">
      <PlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <SkillPicker
        skills={skills}
        value={undefined}
        onChange={onAdd}
        disabled={disabled}
        placeholder={t("addRequirement")}
        className="min-w-0 flex-1"
      />
    </div>
  );
}

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Record<string, string>;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(!next || next === ALL ? undefined : String(next))} items={items}>
      <SelectTrigger className={cn("w-full bg-background sm:w-52")} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([id, name]) => (
          <SelectItem key={id} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


/** Một điều kiện: chip "Java  từ mức [1][2][3][4][5]  ×". Mức chọn bằng 5 ô bấm thẳng, nhìn là biết bấm được. */
function RequirementChip({
  skill,
  requirement,
  onLevelChange,
  onRemove,
}: {
  skill: Skill | undefined;
  requirement: SkillSearchCriteria["requirements"][number];
  onLevelChange: (level: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Skills.Search");
  const name = skill?.name ?? requirement.code;
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border bg-background py-1 pr-1 pl-3 text-sm">
      <span className="truncate font-medium">{name}</span>
      {skill && !skill.active && <Badge variant="outline">{t("inactive")}</Badge>}
      <span className="text-xs whitespace-nowrap text-muted-foreground">{t("fromLevel")}</span>
      <MinLevelStepper value={requirement.minLevel} onChange={onLevelChange} label={t("minLevel", { name })} />
      <Button variant="ghost" size="icon-xs" className="rounded-full" onClick={onRemove} aria-label={t("remove", { name })}>
        <XIcon />
      </Button>
    </span>
  );
}

/**
 * Mức tối thiểu 1–5 như thanh mức: các ô từ 1 đến mức đang chọn tô màu. Là một nhóm radio: Tab vào ô đang chọn, mũi tên
 * trái / phải đổi mức. Rê chuột (hoặc trình đọc màn hình) đọc được tên mức.
 */
function MinLevelStepper({ value, onChange, label }: { value: number; onChange: (level: number) => void; label: string }) {
  const t = useTranslations("Skills.Search");
  const tLevels = useTranslations("Skills.Levels");

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, level: number) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = Math.min(Math.max(level + delta, 1), 5);
    onChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-level="${next}"]`)?.focus();
  }

  return (
    <span role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5">
      {SKILL_LEVELS.map((level) => {
        const text = t("atLeast", { level, name: tLevels(`${level}.name`) });
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={level === value}
            aria-label={text}
            title={text}
            data-level={level}
            tabIndex={level === value ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(event) => onKeyDown(event, level)}
            className={cn(
              "flex size-6 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              level <= value
                ? "bg-primary text-primary-foreground hover:bg-primary/85"
                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground",
            )}
          >
            {level}
          </button>
        );
      })}
    </span>
  );
}

/** Mức của một kỹ năng khớp: thanh, số, và icon đồng hồ cam nếu chưa xác nhận (có chú thích phía trên bảng). */
function MatchedLevel({ skill }: { skill: EmployeeSkill }) {
  const t = useTranslations("Skills.Search");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <LevelMeter level={skill.level} />
      <span className="tabular-nums">{skill.level}</span>
      {!skill.confirmed && (
        <span title={t("unconfirmed")} className="inline-flex">
          <ClockIcon className="size-3.5 text-warning" aria-hidden />
          <span className="sr-only">{t("unconfirmed")}</span>
        </span>
      )}
    </span>
  );
}

/** Dạng gộp: "Java ■■■■□ 4 ◷   Spring Boot ■■■□□ 3" xếp cạnh nhau, xuống dòng khi hết chỗ. */
function MatchedList({ skills, className }: { skills: EmployeeSkill[]; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm", className)}>
      {skills.map((skill) => (
        <span key={skill.skillId} className="inline-flex items-center gap-2 whitespace-nowrap">
          {skill.skillName}
          <MatchedLevel skill={skill} />
        </span>
      ))}
    </span>
  );
}
