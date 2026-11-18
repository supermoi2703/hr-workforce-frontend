"use client";

import { useMemo, useState } from "react";
import { PartyPopperIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime, formatNumber } from "@/lib/format";
import { confirmSkill } from "../api";
import { usePendingSkills, useSkillErrorMessage, useSkillMutation } from "../hooks";
import type { PendingSkill } from "../types";
import { EmployeeSkillsSheet, type SheetPerson } from "./employee-skills-sheet";
import { PersonCell, RowChevron, SECONDARY_ACTION } from "./person-cell";
import { LevelLabel } from "./skill-level";
import { VerifyLevelDialog, type VerifyTarget } from "./verify-level-dialog";

const rowKey = (row: PendingSkill) => `${row.employeeId}:${row.skill.skillId}`;
const personOf = (row: PendingSkill): SheetPerson => ({
  employeeId: row.employeeId,
  fullName: row.fullName,
  employeeCode: row.employeeCode,
});

/** Màn hình hẹp (< md): kỹ năng, mức và nút gộp vào ô nhân viên, các cột riêng ẩn đi để không phải cuộn ngang. */
const WIDE_ONLY = "hidden md:table-cell";

/**
 * Tab "Chờ xác nhận" (ai có cấp dưới trên sơ đồ, hoặc HR / Admin theo skill:verify): kỹ năng cấp dưới vừa khai, cũ
 * nhất trước. Xác nhận = chốt đúng mức tự khai; "Chốt mức khác" khi thấy chưa đúng. Không gồm kỹ năng của chính mình
 * (không ai tự xác nhận). Bấm cả dòng (hoặc tên) mở khung kỹ năng của người đó, nơi xử lý được hết kỹ năng của họ.
 * Không gom theo người (server chia trang theo thứ tự cũ nhất trước); dòng liền sau cùng người thì không lặp tên.
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

  // Dòng có cùng người với dòng ngay trên (trong trang đang xem)
  const repeated = useMemo(() => {
    const rows = page?.content ?? [];
    return new Set(rows.filter((row, i) => i > 0 && rows[i - 1].employeeId === row.employeeId).map(rowKey));
  }, [page]);

  const columns = useMemo(() => {
    const actions = (row: PendingSkill) => {
      const busy = confirmingKey === rowKey(row);
      return (
        <span className="flex flex-wrap gap-2 md:flex-col md:items-stretch xl:flex-row xl:flex-nowrap xl:justify-end">
          <Button size="sm" variant="outline" className={SECONDARY_ACTION} onClick={() => setAdjusting({ employeeId: row.employeeId, fullName: row.fullName, skill: row.skill })}>
            {t("adjust")}
          </Button>
          <Button
            size="sm"
            className="font-semibold"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(row, {
                onSuccess: () => toast.success(t("confirmed", { name: row.skill.skillName, person: row.fullName, level: row.skill.level })),
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          >
            {busy && <Spinner />} {t("confirm")}
          </Button>
        </span>
      );
    };

    const col = createDataTableColumns<PendingSkill>();
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
                repeated={repeated.has(rowKey(row))}
                onOpen={() => setPerson(personOf(row))}
              />
              <span className="flex flex-col gap-2 md:hidden">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{row.skill.skillName}</span>
                  <LevelLabel level={row.skill.level} />
                </span>
                {actions(row)}
              </span>
            </span>
          );
        },
      }),
      col.accessor((row) => row.skill.skillName, {
        id: "skill",
        header: t("skill"),
        meta: { className: WIDE_ONLY },
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
        meta: { className: WIDE_ONLY },
        cell: (c) => {
          const { skill } = c.row.original;
          return (
            <span className="flex flex-col gap-1">
              <LevelLabel level={skill.level} />
              {skill.yearsExperience !== null && (
                <span className="text-xs text-muted-foreground">{t("years", { years: formatNumber(skill.yearsExperience) })}</span>
              )}
              {skill.note && (
                <span className="line-clamp-2 max-w-72 text-xs whitespace-normal text-muted-foreground" title={skill.note}>
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
        meta: { className: "hidden xl:table-cell" },
        cell: (c) => (
          <time dateTime={c.getValue()} className="whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDateTime(c.getValue())}
          </time>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        meta: { className: WIDE_ONLY },
        cell: (c) => actions(c.row.original),
      }),
      // Màn hình vừa (md–xl) chật: hai nút xếp chồng, bỏ dấu › để bảng không phải cuộn ngang
      col.display({ id: "open", header: "", meta: { className: "w-8 md:hidden xl:table-cell" }, cell: () => <RowChevron /> }),
    ]);
  }, [t, tCategory, confirm, confirmingKey, errorMessage, repeated]);

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
        onRowClick={(row) => setPerson(personOf(row))}
        {...tableState.bind}
        onSortingChange={undefined}
      />
      <VerifyLevelDialog target={adjusting} onClose={() => setAdjusting(null)} />
      <EmployeeSkillsSheet person={person} onClose={() => setPerson(null)} />
    </div>
  );
}
