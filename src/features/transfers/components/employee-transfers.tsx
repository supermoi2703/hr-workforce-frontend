"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { useEmployeeTransfers } from "../hooks";
import { canCancelTransfer, canProposeTransfer, changedUnits, unitName } from "../rules";
import type { OrgOptions, Transfer, TransferEmployee, UnitKind, UnitSet } from "../types";
import { CancelTransferDialog } from "./cancel-transfer-dialog";
import { TransferDialog } from "./transfer-dialog";
import { TransferStatusBadge } from "./transfer-status-badge";

type EmployeeTransfersProps = {
  employee: TransferEmployee;
  org: OrgOptions;
};

/**
 * Tab "Công tác" trong hồ sơ: lịch sử điều chuyển của một nhân viên (mới nhất trước) và nút đề xuất. Đây là nơi duy nhất
 * đề xuất điều chuyển, nên luôn đúng nhân viên và biết sẵn đơn vị hiện tại.
 */
export function EmployeeTransfers({ employee, org }: EmployeeTransfersProps) {
  const t = useTranslations("Transfers.Tab");
  const { user, hasPermission } = useCurrentUser();
  const query = useEmployeeTransfers(employee.id);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const canPropose = canProposeTransfer(employee, user?.employeeId, hasPermission, query.data);

  let content;
  if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.length === 0) {
    content = <EmptyState title={t("empty")} className="border border-dashed" />;
  } else {
    content = (
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {query.data.map((transfer) => (
          <TransferItem
            key={transfer.id}
            transfer={transfer}
            org={org}
            canCancel={canCancelTransfer(transfer, hasPermission)}
            onCancel={() => setCancellingId(transfer.id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {canPropose && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setProposeOpen(true)}>
            <ArrowRightLeftIcon /> {t("propose")}
          </Button>
        </div>
      )}
      {content}
      {canPropose && <TransferDialog employee={employee} org={org} open={proposeOpen} onOpenChange={setProposeOpen} />}
      <CancelTransferDialog transferId={cancellingId} onClose={() => setCancellingId(null)} />
    </div>
  );
}

/** Tên đơn vị theo loại, trong danh mục tổ chức. */
function nameOf(org: OrgOptions, kind: UnitKind, units: UnitSet): string {
  switch (kind) {
    case "office":
      return unitName(org.offices, units.officeId);
    case "department":
      return unitName(org.departments, units.departmentId);
    case "team":
      return unitName(org.teams, units.teamId);
    case "position":
      return unitName(org.positions, units.positionId);
  }
}

function TransferItem({
  transfer,
  org,
  canCancel,
  onCancel,
}: {
  transfer: Transfer;
  org: OrgOptions;
  canCancel: boolean;
  onCancel: () => void;
}) {
  const t = useTranslations("Transfers.Tab");
  const tKinds = useTranslations("Transfers.kinds");
  const kinds = changedUnits(transfer.from, transfer.to);
  const cancelReason = transfer.cancelReason;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <TransferStatusBadge status={transfer.status} />
          <span className="text-muted-foreground tabular-nums">{t("effective", { date: formatDate(transfer.effectiveDate) })}</span>
        </span>
        <span className="flex items-center gap-1">
          {transfer.approvalRequestId && (
            <Link
              href={`/approvals/${transfer.approvalRequestId}`}
              className={buttonVariants({ variant: "link", size: "xs" })}
            >
              {t("viewApproval")}
            </Link>
          )}
          {canCancel && (
            <Button variant="outline" size="xs" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {kinds.map((kind) => (
          <li key={kind} className="flex flex-wrap items-center gap-x-1.5">
            <span className="text-muted-foreground">{tKinds(kind)}:</span>
            <span>{nameOf(org, kind, transfer.from)}</span>
            <span aria-label={t("changedTo")}>→</span>
            <span className="font-medium">{nameOf(org, kind, transfer.to)}</span>
          </li>
        ))}
      </ul>
      <p className="break-words text-muted-foreground">{t("reason", { reason: transfer.reason })}</p>
      {transfer.status === "APPLIED" && transfer.appliedOn && transfer.appliedOn !== transfer.effectiveDate && (
        <p className="text-muted-foreground">{t("appliedOn", { date: formatDate(transfer.appliedOn) })}</p>
      )}
      {transfer.status === "CANCELLED" && cancelReason && (
        <p className="break-words text-muted-foreground">
          {t("cancelledBecause", {
            reason: t.has(`cancelReasons.${cancelReason}` as never) ? t(`cancelReasons.${cancelReason}` as never) : cancelReason,
          })}
        </p>
      )}
    </li>
  );
}
