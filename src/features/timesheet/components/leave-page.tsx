"use client";

import { useState } from "react";
import { HousePlusIcon, TreePalmIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, formatNumber, todayIsoDate } from "@/lib/format";
import { useCancelLeave, useDecide, useMyBalance, useMyLeave, useTimeInbox, useTimesheetErrorMessage, useWithdrawLeave } from "../hooks";
import type { TimeApproval } from "../hooks";
import type { LeaveRequest } from "../types";
import { LeaveRequestDialog } from "./leave-request-dialog";
import { RemoteWorkDialog } from "./remote-work-dialog";
import { RemoteWorkPanel } from "./remote-work-panel";
import { LeaveStatusBadge } from "./status-badge";

/**
 * Nghỉ phép: số dư phép năm (còn dùng được, đã nghỉ, đang giữ cho đơn chờ duyệt, đã cộng), đơn của tôi (rút đơn đang
 * chờ, xin hủy đơn đã duyệt), làm từ xa, và hộp "Cần tôi duyệt" cho người duyệt (đơn nghỉ, WFH, hủy đơn, đăng ký giờ làm).
 */
export function LeavePage() {
  const t = useTranslations("Leave");
  const inbox = useTimeInbox();
  const [tab, setTab] = useState<"mine" | "remote" | "inbox">("mine");
  const [requesting, setRequesting] = useState<"leave" | "remote" | null>(null);
  const inboxCount = inbox.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" onClick={() => setRequesting("remote")}>
              <HousePlusIcon /> {t("newRemote")}
            </Button>
            <Button onClick={() => setRequesting("leave")}>
              <TreePalmIcon /> {t("newRequest")}
            </Button>
          </>
        }
      />

      <BalanceCards />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "mine" | "remote" | "inbox")}>
        <TabsList>
          <TabsTrigger value="mine">{t("tabs.mine")}</TabsTrigger>
          <TabsTrigger value="remote">{t("tabs.remote")}</TabsTrigger>
          <TabsTrigger value="inbox">
            {t("tabs.inbox")}
            {inboxCount > 0 && <Badge variant="warning" className="ml-1">{inboxCount}</Badge>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          <MyRequests />
        </TabsContent>
        <TabsContent value="remote" className="mt-4">
          <RemoteWorkPanel />
        </TabsContent>
        <TabsContent value="inbox" className="mt-4">
          <Inbox query={inbox} />
        </TabsContent>
      </Tabs>

      {requesting === "leave" && <LeaveRequestDialog initialDate={todayIsoDate()} onClose={() => setRequesting(null)} />}
      {requesting === "remote" && <RemoteWorkDialog initialDate={todayIsoDate()} onClose={() => setRequesting(null)} />}
    </>
  );
}

function BalanceCards() {
  const t = useTranslations("Leave.balance");
  const balance = useMyBalance();
  if (balance.isPending) return <LoadingState />;
  if (balance.isError) return <ErrorState error={balance.error} onRetry={() => balance.refetch()} />;
  const b = balance.data;
  const cards = [
    { key: "available", value: b.available, note: t("availableNote", { year: b.year }) },
    { key: "used", value: b.used, note: t("usedNote") },
    { key: "held", value: b.held, note: t("heldNote") },
    { key: "accrued", value: b.accrued, note: t("accruedNote", { annual: formatNumber(b.annualDays) }) },
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} size="sm">
          <CardHeader>
            <CardDescription>{t(card.key)}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{t("daysValue", { days: formatNumber(card.value) })}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{card.note}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function MyRequests() {
  const t = useTranslations("Leave");
  const requests = useMyLeave();
  const withdraw = useWithdrawLeave();
  const errorMessage = useTimesheetErrorMessage();
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);

  if (requests.isPending) return <LoadingState />;
  if (requests.isError) return <ErrorState error={requests.error} onRetry={() => requests.refetch()} />;
  if (requests.data.length === 0) return <EmptyState title={t("mine.emptyTitle")} description={t("mine.emptyDescription")} />;

  async function doWithdraw(request: LeaveRequest) {
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
            <TableHead>{t("mine.columns.type")}</TableHead>
            <TableHead>{t("mine.columns.when")}</TableHead>
            <TableHead className="text-right">{t("mine.columns.days")}</TableHead>
            <TableHead>{t("mine.columns.reason")}</TableHead>
            <TableHead>{t("mine.columns.status")}</TableHead>
            <TableHead className="text-right">{t("mine.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.data.map((r) => {
            const waiting = r.status === "PENDING" || r.cancelStatus === "PENDING";
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{t(`types.${r.leaveType}`)}</TableCell>
                <TableCell className="tabular-nums">{whenOf(r, t(`parts.${r.part}`))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.days)}</TableCell>
                <TableCell className="max-w-64 truncate" title={r.reason}>{r.reason}</TableCell>
                <TableCell>
                  <LeaveStatusBadge request={r} />
                </TableCell>
                <TableCell className="text-right">
                  {waiting && (
                    <ConfirmDialog
                      trigger={<Button variant="outline" size="sm" />}
                      triggerLabel={r.status === "PENDING" ? t("mine.withdraw") : t("mine.withdrawCancel")}
                      title={r.status === "PENDING" ? t("mine.withdrawTitle") : t("mine.withdrawCancelTitle")}
                      confirmLabel={t("mine.withdraw")}
                      destructive
                      onConfirm={() => doWithdraw(r)}
                    />
                  )}
                  {r.status === "APPROVED" && r.cancelStatus !== "PENDING" && (
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

function whenOf(r: LeaveRequest, partLabel: string): string {
  if (r.startDate === r.endDate) {
    return r.part === "FULL_DAY" ? formatDate(r.startDate) : `${formatDate(r.startDate)} · ${partLabel}`;
  }
  return `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`;
}

function CancelDialog({ request, onClose }: { request: LeaveRequest; onClose: () => void }) {
  const t = useTranslations("Leave.cancelDialog");
  const cancel = useCancelLeave();
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
          <Label htmlFor="cancel-reason">{t("reason")}</Label>
          <Textarea id="cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
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

function Inbox({ query }: { query: ReturnType<typeof useTimeInbox> }) {
  const t = useTranslations("Leave.inbox");
  const [deciding, setDeciding] = useState<{ item: TimeApproval; approved: boolean } | null>(null);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;

  return (
    <div className="space-y-3">
      {query.data.map((item) => (
        <Card key={item.id} size="sm">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Badge variant="outline">{t(`types.${item.type}`)}</Badge>
              {item.title.startsWith("[Gấp]") && <Badge variant="destructive">{t("urgent")}</Badge>}
              <span>{item.title.replace(/^\[Gấp\]\s*/, "")}</span>
            </CardTitle>
            <CardDescription>
              {t("meta", { at: formatDateTime(item.submittedAt), step: item.currentStepName ?? "—" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm">{item.summary ? t("reason", { reason: item.summary }) : t("noReason")}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeciding({ item, approved: false })}>
                {t("reject")}
              </Button>
              <Button size="sm" onClick={() => setDeciding({ item, approved: true })}>
                {t("approve")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {deciding && <DecideDialog item={deciding.item} approved={deciding.approved} onClose={() => setDeciding(null)} />}
    </div>
  );
}

function DecideDialog({ item, approved, onClose }: { item: TimeApproval; approved: boolean; onClose: () => void }) {
  const t = useTranslations("Leave.inbox");
  const decide = useDecide();
  const errorMessage = useTimesheetErrorMessage();
  const [comment, setComment] = useState("");
  const commentRequired = !approved;

  async function send() {
    try {
      await decide.mutateAsync({ id: item.id, approved, comment: comment.trim() });
      toast.success(approved ? t("approved") : t("rejected"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{approved ? t("approveTitle") : t("rejectTitle")}</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="decide-comment">{commentRequired ? t("rejectReason") : t("comment")}</Label>
          <Textarea id="decide-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("back")}
          </Button>
          <Button variant={approved ? "default" : "destructive"} onClick={send} disabled={decide.isPending || (commentRequired && !comment.trim())}>
            {decide.isPending && <Spinner />} {approved ? t("approve") : t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
