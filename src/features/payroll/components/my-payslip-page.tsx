"use client";

import { useState } from "react";
import { CircleCheckIcon, ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { feedbackState, MAX_NOTE, MIN_NOTE, validateFeedback } from "../feedback";
import { useMyPayslip, useMyPeriods, usePayrollErrorMessage, useSendFeedback } from "../hooks";
import { formatQuantity } from "../inputs";
import type { FeedbackKind, MyPayslip } from "../types";

/** Phiếu lương của tôi: chọn kỳ đã phát hành, xem phiếu, bấm Đúng hoặc Thắc mắc trong hạn. */
export function MyPayslipPage() {
  const t = useTranslations("Payroll.mine");
  const periods = useMyPeriods();
  const [picked, setPicked] = useState<string | null>(null);

  if (periods.isPending) return <LoadingState />;
  if (periods.error) return <ErrorState error={periods.error} onRetry={() => periods.refetch()} />;

  // Danh sách backend chưa chắc sắp xếp: mặc định kỳ mới nhất.
  const months = periods.data.map((p) => p.month).sort((a, b) => b.localeCompare(a));
  const month = picked && months.includes(picked) ? picked : (months[0] ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          months.length > 0 && month ? (
            <div className="w-36">
              <ChoiceSelect
                value={month}
                onChange={(value) => value && setPicked(value)}
                choices={months.map((m) => ({ value: m, label: m }))}
                ariaLabel={t("period")}
              />
            </div>
          ) : undefined
        }
      />
      {month ? <PayslipView month={month} /> : <EmptyState title={t("empty")} />}
    </div>
  );
}

function PayslipView({ month }: { month: string }) {
  const t = useTranslations("Payroll.mine");
  const query = useMyPayslip(month);
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} title={t("loadError")} onRetry={() => query.refetch()} />;
  return <Slip data={query.data} month={month} />;
}

function Row({ label, value, strong, negative }: { label: string; value: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""} ${negative ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}

function Slip({ data, month }: { data: MyPayslip; month: string }) {
  const t = useTranslations("Payroll.mine");
  const p = data.payslip;
  const deduction = (value: number) => formatCurrency(value > 0 ? -value : value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>{t("slipOf", { month })}</span>
        <span>
          {t("days")}: <strong className="tabular-nums text-foreground">{formatNumber(p.paidDays)} / {formatNumber(p.standardDays)}</strong>
        </span>
      </div>

      <dl className="divide-y rounded-xl border bg-card text-sm">
        <Row label={t("blockA")} value={formatCurrency(p.blockA)} />
        <Row label={t("blockB")} value={formatCurrency(p.blockB)} />
        <Row label={t("adjust")} value={formatCurrency(p.adjust)} negative={p.adjust < 0} />
        <Row label={t("gross")} value={formatCurrency(p.gross)} strong />
        {p.nonDeductible ? (
          <div className="px-4 py-2 text-muted-foreground">{t("nonDeductible")}</div>
        ) : (
          <>
            <Row label={t("si")} value={deduction(p.si)} />
            <Row label={t("pit")} value={deduction(p.pit)} />
          </>
        )}
        <div className="flex items-baseline justify-between gap-4 rounded-b-xl bg-primary/5 px-4 py-4">
          <dt className="font-heading text-base font-semibold">{t("net")}</dt>
          <dd className="font-heading text-2xl font-semibold tabular-nums">{formatCurrency(p.net)}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        {t("dependents")}: <span className="tabular-nums text-foreground">{formatNumber(p.dependents)}</span>
        {" · "}
        {t("kpi")}: <span className="tabular-nums text-foreground">{p.kpiCoefficient === null ? "—" : formatQuantity(p.kpiCoefficient)}</span>
      </p>

      <details className="rounded-xl border bg-card text-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium">{t("howCalculated")}</summary>
        {p.lines.length === 0 ? (
          <p className="px-4 pb-3 text-muted-foreground">{t("noLines")}</p>
        ) : (
          <ul className="divide-y border-t">
            {p.lines.map((line, index) => (
              <li key={`${line.code}-${index}`} className="flex items-start justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.baseAmount !== null && `${t("base")} ${formatCurrency(line.baseAmount)}`}
                    {line.rate !== null && ` · ${t("rate")} ${formatQuantity(line.rate)}`}
                  </p>
                  {line.explanation && <p className="text-xs text-muted-foreground">{line.explanation}</p>}
                </div>
                <span className="shrink-0 tabular-nums">{formatCurrency(line.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <FeedbackBlock data={data} month={month} />
    </div>
  );
}

function FeedbackBlock({ data, month }: { data: MyPayslip; month: string }) {
  const t = useTranslations("Payroll.mine");
  const errorMessage = usePayrollErrorMessage();
  const send = useSendFeedback(month);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState<FeedbackKind | null>(null);
  const { feedback } = data;

  async function submit(kind: FeedbackKind) {
    setTouched(kind);
    if (validateFeedback(kind, note)) return;
    try {
      await send.mutateAsync({ kind, note: note.trim() || undefined });
      toast.success(kind === "CONFIRM" ? t("sentConfirm") : t("sentDispute"));
      setNote("");
      setTouched(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (feedback) {
    const state = feedbackState(feedback);
    return (
      <Alert>
        {state === "waiting" ? <ClockIcon /> : <CircleCheckIcon />}
        <AlertDescription className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {t(`state.${state}`)}
            {state === "accepted" && <Badge variant="success">{t("state.acceptedBadge")}</Badge>}
            {state === "rejected" && <Badge variant="destructive">{t("state.rejectedBadge")}</Badge>}
          </p>
          {feedback.note && <p>{t("yourNote")}: {feedback.note}</p>}
          {feedback.decisionReason && <p>{t("hrReason")}: {feedback.decisionReason}</p>}
          {feedback.handledAt && <p className="text-xs text-muted-foreground">{formatDateTime(feedback.handledAt)}</p>}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data.canRespond) {
    return (
      <Alert>
        <ClockIcon />
        <AlertDescription>
          {data.periodStatus === "PUBLISHED" || data.periodStatus === "CLOSED" ? t("expired") : t("cannotRespond")}
          {data.complaintDeadline && ` (${t("deadline", { date: formatDate(data.complaintDeadline) })})`}
        </AlertDescription>
      </Alert>
    );
  }

  const noteError = touched ? validateFeedback(touched, note) : null;
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">
        {t("respondTitle")}
        {data.complaintDeadline && <span className="font-normal text-muted-foreground"> — {t("deadline", { date: formatDate(data.complaintDeadline) })}</span>}
      </p>
      <div className="space-y-1">
        <Label htmlFor="payslip-note">{t("note")}</Label>
        <Textarea
          id="payslip-note"
          rows={3}
          maxLength={MAX_NOTE}
          value={note}
          aria-invalid={!!noteError}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className={`text-xs ${noteError ? "text-destructive" : "text-muted-foreground"}`}>
          {noteError ? t(`validation.${noteError}`, { min: MIN_NOTE, max: MAX_NOTE }) : t("noteHint", { min: MIN_NOTE, max: MAX_NOTE })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => submit("CONFIRM")} disabled={send.isPending}>
          {send.isPending && <Spinner />} {t("confirmButton")}
        </Button>
        <Button variant="outline" onClick={() => submit("DISPUTE")} disabled={send.isPending}>
          {t("disputeButton")}
        </Button>
      </div>
    </section>
  );
}
