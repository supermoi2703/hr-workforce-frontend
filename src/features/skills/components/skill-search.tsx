"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, UsersRoundIcon, XIcon } from "lucide-react";
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
import { SKILL_LEVELS, type Skill, type SkillSearchCriteria, type SkillSearchResult } from "../types";
import { EmployeeSkillsSheet, type SheetPerson } from "./employee-skills-sheet";
import { PersonCell, ViewSkillsButton } from "./person-cell";
import { LevelMeter } from "./skill-level";
import { SkillPicker } from "./skill-picker";

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
  const tLevels = useTranslations("Skills.Levels");
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
            <PersonCell
              fullName={row.fullName}
              employeeCode={row.employeeCode}
              extra={row.level && <Badge variant="outline">{t(`employeeLevel.${row.level}`)}</Badge>}
              onOpen={() => setPerson(personOf(row))}
            />
          );
        },
      }),
      col.display({
        id: "matched",
        header: t("matched"),
        cell: (c) => (
          <span className="flex flex-col gap-1">
            {c.row.original.matchedSkills.map((skill) => (
              <span key={skill.skillId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-24">{skill.skillName}</span>
                <LevelMeter level={skill.level} />
                <span className="tabular-nums">{skill.level}</span>
                {!skill.confirmed && <Badge variant="warning">{t("unconfirmed")}</Badge>}
              </span>
            ))}
          </span>
        ),
      }),
      col.display({
        id: "unit",
        header: t("unit"),
        cell: (c) => {
          const row = c.row.original;
          const dept = units.nameOf(row.departmentId);
          const team = units.nameOf(row.teamId);
          return dept ? (
            <span className="flex flex-col">
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
        cell: (c) => units.nameOf(c.row.original.officeId) ?? <span className="text-muted-foreground">—</span>,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: (c) => (
          <span className="flex justify-end">
            <ViewSkillsButton fullName={c.row.original.fullName} onOpen={() => setPerson(personOf(c.row.original))} />
          </span>
        ),
      }),
    ]);
  }, [t, units]);

  const levelItems = Object.fromEntries(SKILL_LEVELS.map((level) => [String(level), t("atLeast", { level, name: tLevels(`${level}.name`) })]));
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

        {criteria.requirements.length > 0 && (
          <ul className="flex flex-col gap-2">
            {criteria.requirements.map((requirement) => {
              const skill = byCode.get(requirement.code);
              return (
                <li key={requirement.code} className="flex flex-col gap-2 rounded-lg border bg-background p-2 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-2 px-1">
                    <span className="truncate font-medium">{skill?.name ?? requirement.code}</span>
                    {skill && !skill.active && <Badge variant="outline">{t("inactive")}</Badge>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Select
                      value={String(requirement.minLevel)}
                      onValueChange={(value) => value && setMinLevel(requirement.code, Number(value))}
                      items={levelItems}
                    >
                      <SelectTrigger className="w-full sm:w-72" aria-label={t("minLevel", { name: skill?.name ?? requirement.code })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_LEVELS.map((level) => (
                          <SelectItem key={level} value={String(level)}>
                            {levelItems[String(level)]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRequirement(requirement.code)}
                      aria-label={t("remove", { name: skill?.name ?? requirement.code })}
                    >
                      <XIcon />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {criteria.requirements.length < MAX_REQUIREMENTS ? (
          <AddRequirement skills={skills} disabled={chosen} onAdd={addRequirement} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("maxReached", { max: MAX_REQUIREMENTS })}</p>
        )}

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
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t("resultCount", { count: query.data.totalElements })}
            </p>
          )}
          <DataTable
            columns={columns}
            query={query}
            getRowId={(row) => row.employeeId}
            pageSizeOptions={[20, 50, 100]}
            empty={<EmptyState icon={<UsersRoundIcon />} title={t("emptyTitle")} description={t("empty")} />}
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
    <div className="flex items-center gap-2 sm:max-w-sm">
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
