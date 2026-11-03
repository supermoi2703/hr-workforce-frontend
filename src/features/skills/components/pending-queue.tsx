"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PartyPopperIcon, SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDateTime, formatNumber } from "@/lib/format";
import { confirmSkill } from "../api";
import { usePendingSkills, useSkillErrorMessage, useSkillMutation } from "../hooks";
import type { PendingSkill } from "../types";
import { EmployeeSkillsSheet, type SheetPerson } from "./employee-skills-sheet";
import { LevelLabel } from "./skill-level";
import { VerifyLevelDialog, type VerifyTarget } from "./verify-level-dialog";

const rowKey = (row: PendingSkill) => `${row.employeeId}:${row.skill.skillId}`;

/**
 * Tab "Chờ xác nhận" (skill:verify): kỹ năng cấp dưới vừa khai, cũ nhất trước. Xác nhận = chốt đúng mức tự khai;
 * "Chốt mức khác" khi thấy chưa đúng. Không gồm kỹ năng của chính mình (không ai tự xác nhận).
 */
export function PendingQueue() {
  const t = useTranslations("Skills.Pending");
  const tCategory = useTranslations("Skills.Categories");
  const errorMessage = useSkillErrorMessage();
  const tableState = useDataTableState({ pageSize: 20 });
  const query = usePendingSkills(tableState.pageParams, true);
  const [adjusting, setAdjusting] = useState<VerifyTarget | null>(null);
  const [person, setPerson] = useState<SheetPerson | null>(null);
  const confirm = useSkillMutation((row: PendingSkill) => confirmSkill(row.employeeId, row.skill.skillId));
  const confirmingKey = confirm.isPending && confirm.variables ? rowKey(confirm.variables) : undefined;

  // Xác nhận hết trang cuối thì trang đó rỗng: lùi một trang.
  const page = query.data;
  if (page && page.content.length === 0 && page.page > 0 && !query.isFetching) {
    tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: page.page - 1 });
  }

  const columns = useMemo(() => {
    const col = createDataTableColumns<PendingSkill>();
    return col.columns([
      col.accessor("fullName", {
        header: t("employee"),
        cell: (c) => {
          const row = c.row.original;
          return (
            <span className="flex items-center gap-3">
              <UserAvatar name={row.fullName} seed={row.employeeCode} />
              <span className="flex min-w-0 flex-col">
                <button
                  type="button"
                  onClick={() => setPerson({ employeeId: row.employeeId, fullName: row.fullName, employeeCode: row.employeeCode })}
                  className="w-fit text-left font-medium hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {row.fullName}
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">{row.employeeCode}</span>
              </span>
            </span>
          );
        },
      }),
      col.accessor((row) => row.skill.skillName, {
        id: "skill",
        header: t("skill"),
        cell: (c) => {
          const { skill } = c.row.original;
          return (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{skill.skillName}</span>
              <span className="text-xs text-muted-foreground">{tCategory(skill.category)}</span>
            </span>
          );
        },
      }),
      col.accessor((row) => row.skill.selfLevel ?? 0, {
        id: "level",
        header: t("declaredLevel"),
        cell: (c) => {
          const { skill } = c.row.original;
          return (
            <span className="flex flex-col gap-1">
              <LevelLabel level={skill.level} />
              {skill.yearsExperience !== null && (
                <span className="text-xs text-muted-foreground">{t("years", { years: formatNumber(skill.yearsExperience) })}</span>
              )}
              {skill.note && (
                <span className="line-clamp-2 max-w-72 text-xs text-muted-foreground" title={skill.note}>
                  {skill.note}
                </span>
              )}
            </span>
          );
        },
      }),
      col.accessor((row) => row.skill.updatedAt, {
        id: "updatedAt",
        header: t("declaredAt"),
        cell: (c) => (
          <time dateTime={c.getValue()} className="whitespace-nowrap tabular-nums">
            {formatDateTime(c.getValue())}
          </time>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: (c) => {
          const row = c.row.original;
          const busy = confirmingKey === rowKey(row);
          return (
            <span className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdjusting({ employeeId: row.employeeId, fullName: row.fullName, skill: row.skill })}
              >
                <SlidersHorizontalIcon /> {t("adjust")}
              </Button>
              <Button
                size="sm"
                disabled={confirm.isPending}
                onClick={() =>
                  confirm.mutate(row, {
                    onSuccess: () =>
                      toast.success(t("confirmed", { name: row.skill.skillName, person: row.fullName, level: row.skill.level })),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
              >
                {busy ? <Spinner /> : <CheckIcon />} {t("confirm")}
              </Button>
            </span>
          );
        },
      }),
    ]);
  }, [t, tCategory, confirm, confirmingKey, errorMessage]);

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {t("description")}
        {page && page.totalElements > 0 && <Badge variant="warning">{t("count", { count: page.totalElements })}</Badge>}
      </p>
      <DataTable
        columns={columns}
        query={query}
        getRowId={rowKey}
        pageSizeOptions={[20, 50, 100]}
        empty={<EmptyState icon={<PartyPopperIcon />} title={t("emptyTitle")} description={t("empty")} />}
        {...tableState.bind}
        onSortingChange={undefined}
      />
      <VerifyLevelDialog target={adjusting} onClose={() => setAdjusting(null)} />
      <EmployeeSkillsSheet person={person} onClose={() => setPerson(null)} />
    </div>
  );
}
