"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getContractError } from "../error-messages";
import { useDeleteSalary, useRefreshContract } from "../hooks";
import { isSalaryEditable, salaryStatuses, type SalaryStatus } from "../rules";
import type { ContractDetail, Salary } from "../types";
import { SalaryDialog } from "./salary-dialog";

const STATUS_VARIANT: Record<SalaryStatus, "success" | "info" | "secondary" | "outline"> = {
  current: "success",
  upcoming: "info",
  past: "secondary",
  replaced: "outline",
};

const AMOUNTS = ["baseSalary", "lunchAllowance", "otherAllowance", "insuranceSalary"] as const;

type SalaryHistoryProps = {
  detail: ContractDetail;
  /** HR quản lý được (contract:manage); không có = chỉ xem (hồ sơ của tôi). */
  canManage?: boolean;
};

/** Lịch sử lương, mới nhất trước. Số tiền che mặc định, bấm "Hiện số" mới thấy (tránh lộ khi chia sẻ màn hình). */
export function SalaryHistory({ detail, canManage = false }: SalaryHistoryProps) {
  const t = useTranslations("Contracts.Salary");
  const tFields = useTranslations("Contracts.Fields");
  const tContractErrors = useTranslations("Contracts.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const { contract, salaries } = detail;
  const today = todayIsoDate();
  const statuses = salaryStatuses(salaries, today);
  const refresh = useRefreshContract(contract.id);
  const remove = useDeleteSalary(contract.id);

  const [revealed, setRevealed] = useState(false);
  // Tách "mức nào" và "đang mở": nội dung giữ nguyên tới khi hiệu ứng đóng xong.
  const [editing, setEditing] = useState<Salary | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Salary | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openDialog(salary?: Salary) {
    setEditing(salary);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    return remove.mutateAsync(deleting.id).then(
      () => toast.success(t("deleted")),
      (error: unknown) => {
        const { message, stale } = getContractError(error, tContractErrors, tErrors);
        toast.error(message);
        if (stale) void refresh();
        throw error;
      },
    );
  }

  const money = (value: number) =>
    revealed ? formatCurrency(value) : <span className="text-muted-foreground">••••••</span>;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-medium">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRevealed((value) => !value)} aria-pressed={revealed}>
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
            {revealed ? t("hide") : t("show")}
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => openDialog()}>
              <PlusIcon /> {t("add")}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tFields("effectiveFrom")}</TableHead>
              {AMOUNTS.map((name) => (
                <TableHead key={name} className="text-right">
                  {tFields(name)}
                </TableHead>
              ))}
              <TableHead>{tFields("status")}</TableHead>
              <TableHead>{tFields("reason")}</TableHead>
              {canManage && (
                <TableHead>
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaries.map((salary) => {
              const status = statuses.get(salary.id) ?? "past";
              const editable = canManage && !salary.replaced && isSalaryEditable(salary, contract, today);
              return (
                <TableRow key={salary.id}>
                  <TableCell>{formatDate(salary.effectiveFrom)}</TableCell>
                  {AMOUNTS.map((name) => (
                    <TableCell
                      key={name}
                      className={cn("text-right tabular-nums", salary.replaced && "text-muted-foreground line-through")}
                    >
                      {money(salary[name])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[status]}>{t(`statuses.${status}`)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal text-muted-foreground">
                    {salary.reason ?? "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {editable && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => openDialog(salary)}>
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("delete")}
                            onClick={() => {
                              setDeleting(salary);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <>
          <SalaryDialog contract={contract} salary={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={t("deleteTitle")}
            description={t("deleteDescription", { date: deleting ? formatDate(deleting.effectiveFrom) : "" })}
            confirmLabel={tCommon("confirm")}
            destructive
            onConfirm={confirmDelete}
          />
        </>
      )}
    </section>
  );
}
