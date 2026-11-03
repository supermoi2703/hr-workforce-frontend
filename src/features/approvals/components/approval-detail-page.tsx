"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowUpRightIcon, FileQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { useApproval, useApprovalTypeLabel, usePersonName, useStepLabel } from "../hooks";
import { getApprovalActions, parseTitle, sourceLink } from "../rules";
import type { ApprovalDetail, HistoryResponse, StepResponse } from "../types";
import { ApprovalActionDialog, type ApprovalAction } from "./approval-action-dialog";
import { ApprovalStatusBadge, DecisionBadge, StepStatusBadge } from "./approval-status-badge";

const LIST_PATH = "/approvals";

/** Chi tiết một yêu cầu: thông tin chung, các bước + người duyệt, dòng thời gian, thao tác của tôi. */
export function ApprovalDetailPage({ id }: { id: string }) {
  const t = useTranslations("Approvals.Detail");
  const query = useApproval(id);
  const { user } = useCurrentUser();

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    // Không tồn tại HOẶC không được xem: backend trả 404 cho cả hai (không lộ là yêu cầu có tồn tại).
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<FileQuestionIcon />}
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
  if (!user) return null;

  return (
    <>
      {backLink}
      <ApprovalDetailContent detail={query.data} myUserId={user.id} />
    </>
  );
}

function ApprovalDetailContent({ detail, myUserId }: { detail: ApprovalDetail; myUserId: string }) {
  const t = useTranslations("Approvals.Detail");
  const tAction = useTranslations("Approvals.Action");
  const tList = useTranslations("Approvals.List");
  const typeLabel = useApprovalTypeLabel();
  const personName = usePersonName();
  const [action, setAction] = useState<ApprovalAction | null>(null);

  const { request } = detail;
  const { urgent, text } = parseTitle(request.title);
  const actions = getApprovalActions(detail, myUserId);
  const source = sourceLink(request.type);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{typeLabel(request.type)}</Badge>
            {urgent && <Badge variant="destructive">{tList("urgent")}</Badge>}
            <ApprovalStatusBadge status={request.status} />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">{text}</h1>
        </div>

        {(actions.canDecide || actions.canWithdraw) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions.canWithdraw && (
              <Button variant="outline" onClick={() => setAction("withdraw")}>
                {tAction("withdraw.submit")}
              </Button>
            )}
            {actions.canDecide && (
              <>
                <Button variant="outline" onClick={() => setAction("reject")}>
                  {tAction("reject.submit")}
                </Button>
                <Button onClick={() => setAction("approve")}>{tAction("approve.submit")}</Button>
              </>
            )}
          </div>
        )}
      </div>

      <DetailList className="max-w-3xl">
        <DetailRow label={t("requester")}>{personName(request.requesterUserId, request.requesterName)}</DetailRow>
        <DetailRow label={t("submittedAt")}>
          <time dateTime={request.submittedAt}>{formatDateTime(request.submittedAt)}</time>
        </DetailRow>
        {request.completedAt && (
          <DetailRow label={t("completedAt")}>
            <time dateTime={request.completedAt}>{formatDateTime(request.completedAt)}</time>
          </DetailRow>
        )}
        <DetailRow label={t("summary")}>
          {request.summary ? (
            <span className="whitespace-pre-line break-words">{request.summary}</span>
          ) : (
            <span className="text-muted-foreground">{t("noSummary")}</span>
          )}
        </DetailRow>
        {source && (
          <DetailRow label={t("source")}>
            <Link href={source} className="inline-flex items-center gap-1 font-medium hover:underline">
              {t("openSource", { type: typeLabel(request.type) })} <ArrowUpRightIcon className="size-4" />
            </Link>
          </DetailRow>
        )}
      </DetailList>

      <section className="flex max-w-3xl flex-col gap-3" aria-labelledby="approval-steps">
        <h2 id="approval-steps" className="font-heading text-base font-semibold">
          {t("steps")}
        </h2>
        <ol className="flex flex-col gap-3">
          {detail.steps.map((step) => (
            <StepItem key={step.stepNo} step={step} current={request.status === "PENDING" && step.stepNo === request.currentStepNo} />
          ))}
        </ol>
      </section>

      <section className="flex max-w-3xl flex-col gap-3" aria-labelledby="approval-timeline">
        <h2 id="approval-timeline" className="font-heading text-base font-semibold">
          {t("timeline")}
        </h2>
        <ol className="flex flex-col divide-y rounded-xl border bg-card">
          {detail.timeline.map((entry, index) => (
            <TimelineItem key={`${entry.at}-${index}`} entry={entry} />
          ))}
        </ol>
      </section>

      <ApprovalActionDialog approvalId={request.id} title={text} action={action} onClose={() => setAction(null)} />
    </>
  );
}

function StepItem({ step, current }: { step: StepResponse; current: boolean }) {
  const t = useTranslations("Approvals.Detail");
  const tModes = useTranslations("Approvals.modes");
  const stepLabel = useStepLabel();
  const personName = usePersonName();

  return (
    <li
      className="overflow-hidden rounded-xl border bg-card data-[current=true]:border-primary"
      data-current={current}
      aria-current={current ? "step" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t("stepTitle", { step: step.stepNo, name: stepLabel(step.rule, step.name) })}
          </p>
          {step.approvers.length > 1 && <p className="text-xs text-muted-foreground">{tModes(step.mode)}</p>}
        </div>
        <StepStatusBadge status={step.status} />
      </div>
      {step.approvers.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">{t("noApprovers")}</p>
      ) : (
        <ul className="divide-y">
          {step.approvers.map((approver) => (
            <li key={approver.userId} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{personName(approver.userId, approver.displayName)}</span>
                <DecisionBadge decision={approver.decision} />
                {approver.assignment.startsWith("ESCALATED_") && (
                  <Badge variant="info" title={t(`assignment.${approver.assignment}` as never)}>
                    {t("escalated")}
                  </Badge>
                )}
                {approver.assignment === "REQUESTER_PRE_APPROVED" && (
                  <Badge variant="secondary">{t("preApproved")}</Badge>
                )}
                {approver.decidedAt && (
                  <time dateTime={approver.decidedAt} className="text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(approver.decidedAt)}
                  </time>
                )}
              </div>
              {approver.comment && <p className="whitespace-pre-line break-words text-muted-foreground">{approver.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function TimelineItem({ entry }: { entry: HistoryResponse }) {
  const t = useTranslations("Approvals");
  const personName = usePersonName();
  const stepLabel = useStepLabel();
  const actor = personName(entry.actorUserId, entry.actorName);
  const meta = entry.metadata ?? {};
  const step = entry.stepNo ?? 0;

  let text: string;
  switch (entry.action) {
    case "STEP_STARTED":
      text = t("history.STEP_STARTED", {
        step,
        name: stepLabel(String(meta.rule ?? ""), String(meta.name ?? "")),
      });
      break;
    case "ESCALATED": {
      const reason = String(meta.reason ?? "");
      text = t("history.ESCALATED", {
        step,
        reason: t.has(`Detail.assignment.${reason}` as never) ? t(`Detail.assignment.${reason}` as never) : reason,
      });
      break;
    }
    case "COMPLETED": {
      const status = String(meta.status ?? "");
      text = t("history.COMPLETED", { status: t.has(`status.${status}` as never) ? t(`status.${status}` as never) : status });
      break;
    }
    default:
      text = t.has(`history.${entry.action}` as never)
        ? t(`history.${entry.action}` as never, { actor, step } as never)
        : entry.action;
  }

  return (
    <li className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:gap-4">
      <time dateTime={entry.at} className="shrink-0 text-muted-foreground tabular-nums sm:w-36">
        {formatDateTime(entry.at)}
      </time>
      <div className="min-w-0">
        <p>{text}</p>
        {entry.comment && <p className="whitespace-pre-line break-words text-muted-foreground">{entry.comment}</p>}
      </div>
    </li>
  );
}
