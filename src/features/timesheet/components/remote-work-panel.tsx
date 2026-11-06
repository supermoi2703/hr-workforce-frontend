"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber, todayIsoDate } from "@/lib/format";
import { useCancelRemoteWork, useMyRemoteWork, useRemoteUsage, useTimesheetErrorMessage, useWithdrawRemoteWork } from "../hooks";
import type { RemoteWorkRequest } from "../types";
import { LeaveStatusBadge } from "./status-badge";

/** Làm từ xa của tôi: số ngày đã giữ trong tuần, tháng và danh sách đơn (rút đơn đang chờ, xin hủy đơn đã duyệt). */
export function RemoteWorkPanel() {
  return (
    <div className="space-y-4">
      <UsageCards />
      <MyRemoteRequests />
    </div>
  );
}

function UsageCards() {
  const t = useTranslations("Leave.remote.usage");
  const usage = useRemoteUsage();
  if (usage.isPending) return <LoadingState />;
  if (usage.isError) return <ErrorState error={usage.error} onRetry={() => usage.refetch()} />;
  const u = usage.data;
  const cards = [
    { key: "personalWeek", value: t("usedValue", { used: formatNumber(u.personalWeek), max: u.maxPersonalWeek }), note: t("personalWeekNote") },
    { key: "personalMonth", value: t("usedValue", { used: formatNumber(u.personalMonth), max: u.maxPersonalMonth }), note: t("personalMonthNote") },
    { key: "objectiveMonth", value: t("daysValue", { days: formatNumber(u.objectiveMonth) }), note: t("objectiveMonthNote") },
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.key} size="sm">
          <CardHeader>
            <CardDescription>{t(card.key)}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{card.note}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function MyRemoteRequests() {
  const t = useTranslations("Leave");
  const requests = useMyRemoteWork();
  const withdraw = useWithdrawRemoteWork();
  const errorMessage = useTimesheetErrorMessage();
  const [cancelling, setCancelling] = useState<RemoteWorkRequest | null>(null);
  const today = todayIsoDate();

  if (requests.isPending) return <LoadingState />;
  if (requests.isError) return <ErrorState error={requests.error} onRetry={() => requests.refetch()} />;
  if (requests.data.length === 0) return <EmptyState title={t("remote.emptyTitle")} description={t("remote.emptyDescription")} />;

  async function doWithdraw(request: RemoteWorkRequest) {
    try {
      await withdraw.mutateAsync(request.id);
      toast.success(t("mine.withdrawn"));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("mine.columns.when")}</TableHead>
            <TableHead>{t("mine.columns.reason")}</TableHead>
            <TableHead>{t("remote.detailColumn")}</TableHead>
            <TableHead>{t("mine.columns.status")}</TableHead>
            <TableHead className="text-right">{t("mine.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.data.map((r) => {
            const waiting = r.status === "PENDING" || r.cancelStatus === "PENDING";
            const cancellable = r.status === "APPROVED" && r.cancelStatus !== "PENDING" && r.workDate > today;
            return (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">
                  {r.part === "FULL_DAY" ? formatDate(r.workDate) : `${formatDate(r.workDate)} · ${t(`parts.${r.part}`)}`}
                </TableCell>
                <TableCell>{t(`remote.reasons.${r.reason}`)}</TableCell>
                <TableCell className="max-w-64 truncate" title={r.detail}>{r.detail}</TableCell>
                <TableCell>
                  <LeaveStatusBadge request={r} />
                </TableCell>
                <TableCell className="text-right">
                  {waiting && (
                    <ConfirmDialog
                      trigger={<Button variant="outline" size="sm" />}
                      triggerLabel={r.status === "PENDING" ? t("mine.withdraw") : t("mine.withdrawCancel")}
                      title={r.status === "PENDING" ? t("remote.withdrawTitle") : t("remote.withdrawCancelTitle")}
                      confirmLabel={t("mine.withdraw")}
                      destructive
                      onConfirm={() => doWithdraw(r)}
                    />
                  )}
                  {cancellable && (
                    <Button variant="ghost" size="sm" onClick={() => setCancelling(r)}>
                      {t("mine.cancel")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {cancelling && <CancelDialog request={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}

function CancelDialog({ request, onClose }: { request: RemoteWorkRequest; onClose: () => void }) {
  const t = useTranslations("Leave.remote.cancelDialog");
  const cancel = useCancelRemoteWork();
  const errorMessage = useTimesheetErrorMessage();
  const [reason, setReason] = useState("");

  async function send() {
    try {
      await cancel.mutateAsync({ id: request.id, reason: reason.trim() });
      toast.success(t("sent"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="remote-cancel-reason">{t("reason")}</Label>
          <Textarea id="remote-cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("back")}
          </Button>
          <Button onClick={send} disabled={!reason.trim() || cancel.isPending}>
            {cancel.isPending && <Spinner />} {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
