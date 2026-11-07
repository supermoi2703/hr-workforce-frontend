"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  CircleOffIcon,
  FileXIcon,
  FilePlus2Icon,
  PencilIcon,
  ScrollTextIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { getContractError } from "../error-messages";
import { useContract, useDeleteContract, useRefreshContract } from "../hooks";
import { getContractActions } from "../rules";
import type { ContractDetail } from "../types";
import { ContractFormDialog, type ContractFormMode } from "./contract-form-dialog";
import { ContractStateBadge } from "./contract-state-badge";
import { EndContractDialog } from "./end-contract-dialog";
import { SalaryHistory } from "./salary-history";

const LIST_PATH = "/contracts";

/** Chi tiết một hợp đồng (contract:read): thông tin, thao tác theo trạng thái, lịch sử lương. */
export function ContractDetailPage({ id }: { id: string }) {
  const t = useTranslations("Contracts.Detail");
  const query = useContract(id);

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    const notFound = isApiError(query.error) && (query.error.status === 404 || query.error.status === 400);
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<FileXIcon />}
            title={t("notFound")}
            description={t("notFoundDescription")}
            className="border border-dashed"
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {backLink}
      <ContractDetailView detail={query.data} />
    </>
  );
}

function ContractDetailView({ detail }: { detail: ContractDetail }) {
  const t = useTranslations("Contracts.Detail");
  const tFields = useTranslations("Contracts.Fields");
  const tType = useTranslations("Contracts.types");
  const tContractErrors = useTranslations("Contracts.Errors");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const { hasPermission } = useCurrentUser();
  const { contract } = detail;
  const actions = getContractActions(contract, hasPermission);
  const refresh = useRefreshContract(contract.id);
  const remove = useDeleteContract(contract.id);

  const [formKind, setFormKind] = useState<Extract<ContractFormMode["kind"], "edit" | "renew">>("edit");
  const [formOpen, setFormOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openForm(kind: "edit" | "renew") {
    setFormKind(kind);
    setFormOpen(true);
  }

  const confirmDelete = () =>
    remove.mutateAsync().then(
      () => {
        toast.success(t("deleted"));
        router.replace(LIST_PATH);
      },
      (error: unknown) => {
        const { message, stale } = getContractError(error, tContractErrors, tErrors);
        toast.error(message);
        if (stale) void refresh();
        throw error;
      },
    );

  const hasMenu = actions.edit || actions.remove || actions.end || actions.renew;
  const employeeName = contract.employeeName ?? contract.employeeCode ?? "—";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            <span className="truncate">{contract.contractNumber}</span>
            <ContractStateBadge state={contract.state} />
          </h1>
          <p className="truncate text-sm text-muted-foreground">{employeeName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Nhật ký đã lọc sẵn theo hợp đồng này; lý do kết thúc sớm nằm ở đây. */}
          {actions.viewAuditLog && (
            <Link
              href={`/admin/audit-logs?${new URLSearchParams({ targetType: "CONTRACT", targetId: contract.id, targetLabel: contract.contractNumber })}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ScrollTextIcon /> {t("viewAuditLog")}
            </Link>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {t("actions")} <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {actions.edit && (
                  <DropdownMenuItem onClick={() => openForm("edit")}>
                    <PencilIcon /> {t("edit")}
                  </DropdownMenuItem>
                )}
                {actions.renew && (
                  <DropdownMenuItem onClick={() => openForm("renew")}>
                    <FilePlus2Icon /> {t("renew")}
                  </DropdownMenuItem>
                )}
                {actions.end && (
                  <DropdownMenuItem onClick={() => setEndOpen(true)}>
                    <CircleOffIcon /> {t("end")}
                  </DropdownMenuItem>
                )}
                {actions.remove && (
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2Icon /> {t("delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <DetailList className="max-w-2xl">
        <DetailRow label={tFields("employee")}>
          {actions.viewEmployee ? (
            <Link href={`/employees/${contract.employeeId}`} className="font-medium hover:underline">
              {employeeName}
            </Link>
          ) : (
            employeeName
          )}
          {contract.employeeCode && (
            <span className="ml-2 font-mono text-xs text-muted-foreground tabular-nums">{contract.employeeCode}</span>
          )}
        </DetailRow>
        <DetailRow label={tFields("type")}>{tType(contract.type)}</DetailRow>
        <DetailRow label={tFields("startDate")}>{formatDate(contract.startDate)}</DetailRow>
        <DetailRow label={tFields("endDate")}>
          {contract.endDate ? (
            formatDate(contract.endDate)
          ) : (
            <span className="text-muted-foreground">{t("noEndDate")}</span>
          )}
        </DetailRow>
      </DetailList>

      <SalaryHistory detail={detail} canManage={actions.addSalary} />

      <ContractFormDialog mode={{ kind: formKind, detail }} open={formOpen} onOpenChange={setFormOpen} />
      {actions.end && <EndContractDialog detail={detail} open={endOpen} onOpenChange={setEndOpen} />}
      {actions.remove && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={t("deleteTitle")}
          description={t("deleteDescription", { number: contract.contractNumber })}
          confirmLabel={t("delete")}
          destructive
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
