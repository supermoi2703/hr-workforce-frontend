"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, formatTime, todayIsoDate } from "@/lib/format";
import { monthRange, shiftMonth } from "../calendar";
import { useDecideMissingOut, useHrDecideExplanation, useHrExplanations, usePendingDecisions, useTimesheetErrorMessage } from "../hooks";
import type { DecisionChoice, Explanation, PendingDecisionDay } from "../types";

const CHOICES: DecisionChoice[] = ["FULL", "HALF", "ZERO"];

/**
 * HR xử lý ngày thiếu check-out: tab "Chờ quyết" (chọn tính đủ công / nửa công / không tính kèm lý do) và tab
 * "Giải trình chờ HR" (duyệt / từ chối giải trình của ngày thiếu check-out). Backend chặn quyết công của chính mình
 * (403) và ngày đã được người khác quyết (409); lỗi hiện qua thông báo.
 */
export function MissingOutPage() {
  const t = useTranslations("MissingOut");
  const [tab, setTab] = useState("pending");
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7));
  const { from, to } = monthRange(month);
  const pending = usePendingDecisions(from, to);
  const queue = useHrExplanations();
  const [deciding, setDeciding] = useState<PendingDecisionDay | null>(null);
  const [handling, setHandling] = useState<{ item: Explanation; approved: boolean } | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
          <TabsTrigger value="explanations">
            {t("tabs.explanations")}
            {queue.data && queue.data.length > 0 ? ` (${queue.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t("previous")}>
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-28 text-center font-medium tabular-nums">
              {t("monthLabel", { month: Number(month.slice(5)), year: month.slice(0, 4) })}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label={t("next")}>
              <ChevronRightIcon />
            </Button>
          </div>
          {pending.isPending ? (
            <LoadingState />
          ) : pending.isError ? (
            <ErrorState error={pending.error} onRetry={() => pending.refetch()} />
          ) : pending.data.length === 0 ? (
            <EmptyState title={t("empty")} description={t("emptyHint")} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employee")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("in")}</TableHead>
                    <TableHead className="text-right">{t("late")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.data.map((row) => (
                    <TableRow key={`${row.employeeId}-${row.workDate}`}>
                      <TableCell>
                        <span className="font-medium">{row.fullName ?? "—"}</span>
                        {row.employeeCode && <span className="ml-2 text-xs text-muted-foreground">{row.employeeCode}</span>}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDate(row.workDate)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatTime(row.firstIn)}
                        {row.outsideOffice && (
                          <Badge variant="warning" className="ml-2">
                            {t("outsideOffice")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.lateMinutes || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setDeciding(row)}>
                          {t("decide")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="explanations" className="mt-4">
          {queue.isPending ? (
            <LoadingState />
          ) : queue.isError ? (
            <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
          ) : queue.data.length === 0 ? (
            <EmptyState title={t("explanationsEmpty")} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employee")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("claimed")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.employeeName ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(item.workDate)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatTime(item.claimedIn)} – {formatTime(item.claimedOut)}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal">
                        {item.reason}
                        <div className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</div>
                      </TableCell>
                      <TableCell className="space-x-2 text-right whitespace-nowrap">
                        <Button size="sm" onClick={() => setHandling({ item, approved: true })}>
                          {t("approve")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setHandling({ item, approved: false })}>
                          {t("reject")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {deciding && <DecideDialog row={deciding} onClose={() => setDeciding(null)} />}
      {handling && <ExplanationDecisionDialog item={handling.item} approved={handling.approved} onClose={() => setHandling(null)} />}
    </div>
  );
}

function DecideDialog({ row, onClose }: { row: PendingDecisionDay; onClose: () => void }) {
  const t = useTranslations("MissingOut.decideDialog");
  const errorMessage = useTimesheetErrorMessage();
  const decide = useDecideMissingOut();
  const [choice, setChoice] = useState<DecisionChoice>("FULL");
  const [reason, setReason] = useState("");

  async function send() {
    try {
      await decide.mutateAsync({ employeeId: row.employeeId, workDate: row.workDate, choice, reason: reason.trim() });
      toast.success(t("done"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !decide.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {row.fullName ?? "—"} · {formatDate(row.workDate)} · {t("checkedIn", { time: formatTime(row.firstIn) })}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("choice")}</legend>
          {CHOICES.map((value) => (
            <label key={value} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm has-[:checked]:border-primary">
              <input type="radio" name="missing-out-choice" className="mt-1" checked={choice === value} onChange={() => setChoice(value)} />
              <span>
                <span className="font-medium">{t(`choices.${value}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`choiceHints.${value}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="space-y-1">
          <Label htmlFor="decide-reason">{t("reason")}</Label>
          <Textarea id="decide-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={decide.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={send} disabled={decide.isPending || reason.trim().length === 0}>
            {decide.isPending && <Spinner />} {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExplanationDecisionDialog({ item, approved, onClose }: { item: Explanation; approved: boolean; onClose: () => void }) {
  const t = useTranslations("MissingOut.explanationDialog");
  const errorMessage = useTimesheetErrorMessage();
  const decide = useHrDecideExplanation();
  const [reason, setReason] = useState("");

  async function send() {
    try {
      await decide.mutateAsync({ id: item.id, approved, reason: reason.trim() });
      toast.success(approved ? t("approved") : t("rejected"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !decide.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{approved ? t("approveTitle") : t("rejectTitle")}</DialogTitle>
          <DialogDescription>
            {item.employeeName ?? "—"} · {formatDate(item.workDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="expl-reason">{t("reason")}</Label>
          <Textarea id="expl-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={decide.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={send} disabled={decide.isPending || reason.trim().length === 0}>
            {decide.isPending && <Spinner />} {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
