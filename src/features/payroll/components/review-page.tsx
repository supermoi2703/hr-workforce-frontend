"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useApprovalSummary, useDecidePayroll, usePayrollErrorMessage } from "../hooks";
import { isValidMonth, isValidRevokeReason, MIN_REVOKE_REASON } from "../status";
import type { ApprovalSummaryTotals } from "../types";
import { useWarningLabel } from "../use-warning-label";
import { decideBlockReason, percentChange } from "../warnings";
import { PeriodStatusBadge } from "./status-badge";

/** Trang người duyệt bảng lương (M-L5): tổng so tháng trước, theo văn phòng, cảnh báo, khoản nhập; Duyệt hoặc Trả lại. */
export function ReviewPage({ month }: { month: string }) {
  const t = useTranslations("Payroll.review");
  const tSheet = useTranslations("Payroll.sheet");
  const warningLabel = useWarningLabel();
  const { user } = useCurrentUser();
  const validMonth = isValidMonth(month);
  const query = useApprovalSummary(validMonth ? month : "");
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);

  const back = (
    <Link href={`/payroll/${month}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (!validMonth) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title={t("notFound")} />
      </div>
    );
  }
  if (query.isPending) return <LoadingState />;
  if (query.error) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        {notFound ? <EmptyState title={t("notFound")} /> : <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      </div>
    );
  }

  const s = query.data;
  const blockReason = decideBlockReason(s.canDecide && !!s.approvalRequestId, s.submittedBy, user?.id);
  const cards: { key: keyof ApprovalSummaryTotals; label: string; money: boolean }[] = [
    { key: "employees", label: t("employees"), money: false },
    { key: "gross", label: tSheet("gross"), money: true },
    { key: "si", label: tSheet("si"), money: true },
    { key: "pit", label: tSheet("pit"), money: true },
    { key: "net", label: tSheet("net"), money: true },
  ];

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={t("title", { month: s.month })}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <PeriodStatusBadge status={s.status} />
            {s.submittedAt && t("submitted", { name: s.submittedByName ?? s.submittedBy ?? "—", at: formatDateTime(s.submittedAt) })}
          </span>
        }
        actions={
          <>
            <Button variant="outline" disabled={blockReason !== null} onClick={() => setDialog("reject")}>
              {t("reject")}
            </Button>
            <Button disabled={blockReason !== null} onClick={() => setDialog("approve")}>
              {t("approve")}
            </Button>
          </>
        }
      />

      {blockReason && (
        <Alert>
          <AlertDescription>{t(`blocked.${blockReason}`)}</AlertDescription>
        </Alert>
      )}
      {s.note && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("note")}: </span>
          {s.note}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-5">
        {cards.map(({ key, label, money }) => {
          const value = s.totals[key];
          const pct = s.prevTotals ? percentChange(value, s.prevTotals[key]) : null;
          return (
            <div key={key} className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{money ? formatCurrency(value) : formatNumber(value)}</dd>
              {pct !== null && (
                <dd className="text-xs text-muted-foreground tabular-nums">{t("vsPrev", { pct: `${pct > 0 ? "+" : ""}${formatNumber(pct)}` })}</dd>
              )}
            </div>
          );
        })}
      </dl>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">{t("byOffice")}</h2>
        {s.byOffice.length === 0 ? (
          <EmptyState title={t("noOffice")} />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">{tSheet("office")}</th>
                  <th className="p-2 text-right">{t("employees")}</th>
                  <th className="p-2 text-right">{tSheet("net")}</th>
                  <th className="p-2 text-right">{t("prevNet")}</th>
                </tr>
              </thead>
              <tbody>
                {s.byOffice.map((row) => (
                  <tr key={row.officeId ?? row.officeName ?? "none"} className="border-t">
                    <td className="p-2">{row.officeName ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">{formatNumber(row.employees)}</td>
                    <td className="p-2 text-right tabular-nums">{formatCurrency(row.net)}</td>
                    <td className="p-2 text-right tabular-nums">{formatCurrency(row.prevNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">{t("warnings")}</h2>
        {s.warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noWarnings")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {s.warnings.map((w) => (
              <li key={w.code}>
                <Link href={`/payroll/${s.month}?warningType=${encodeURIComponent(w.code)}`} className="underline">
                  {tSheet("warningLine", { count: w.count, label: warningLabel(w) })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">{t("inputs")}</h2>
        {s.inputsSummary.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInputs")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {s.inputsSummary.map((row) => (
              <li key={row.code}>
                {t("inputLine", { code: row.code, lines: row.lines, amount: row.amount === null ? "—" : formatCurrency(row.amount) })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog && s.approvalRequestId && (
        <DecideDialog month={s.month} requestId={s.approvalRequestId} decision={dialog} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

function DecideDialog({ month, requestId, decision, onClose }: { month: string; requestId: string; decision: "approve" | "reject"; onClose: () => void }) {
  const t = useTranslations("Payroll.review");
  const errorMessage = usePayrollErrorMessage();
  const mutation = useDecidePayroll();
  const [value, setValue] = useState("");
  const reject = decision === "reject";
  const valid = reject ? isValidRevokeReason(value) : true;

  async function confirm() {
    try {
      await mutation.mutateAsync({ id: requestId, decision, comment: value.trim() });
      toast.success(t(reject ? "done.rejected" : "done.approved"));
      onClose();
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        toast.error(t("conflict"));
        onClose();
      } else {
        toast.error(errorMessage(error));
      }
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !mutation.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(reject ? "rejectTitle" : "approveTitle", { month })}</DialogTitle>
          <DialogDescription>{t(reject ? "rejectDescription" : "approveDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="review-comment">{t(reject ? "reason" : "comment")}</Label>
          <Textarea
            id="review-comment"
            rows={3}
            maxLength={500}
            value={value}
            aria-invalid={reject && value.length > 0 && !valid}
            onChange={(e) => setValue(e.target.value)}
          />
          {reject && <p className="text-xs text-muted-foreground">{t("reasonHint", { min: MIN_REVOKE_REASON })}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t("cancel")}
          </Button>
          <Button variant={reject ? "destructive" : "default"} onClick={confirm} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Spinner />} {t(reject ? "reject" : "approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
