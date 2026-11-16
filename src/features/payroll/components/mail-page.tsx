"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { canSendMail, introOrUndefined, knownMailError, MAX_INTRO, summarizeCounts, validateIntro } from "../mail";
import { useMailStatus, usePayrollErrorMessage, usePeriod, usePreviewMail, useRetryMail, useSendMail } from "../hooks";
import { isValidMonth } from "../status";
import type { MailPreview, MailStatus, MailStatusRow } from "../types";

const VARIANT: Record<MailStatus, "info" | "success" | "destructive"> = {
  PENDING: "info",
  SENT: "success",
  FAILED: "destructive",
};

/** Gửi thông báo phiếu lương qua mail (không có số tiền, không có PDF) và theo dõi từng người. */
export function MailPage({ month }: { month: string }) {
  const t = useTranslations("Payroll.mail");
  const errorMessage = usePayrollErrorMessage();
  const valid = isValidMonth(month);
  const { can } = useCurrentUser();
  const canManage = can({ permissions: ["payroll:manage"] });
  const period = usePeriod(valid ? month : "");
  const tableState = useDataTableState();
  const status = useMailStatus(month, tableState.pageParams.page, tableState.pageParams.size, valid);
  const send = useSendMail(month);
  const retry = useRetryMail(month);
  const preview = usePreviewMail(month);
  const [intro, setIntro] = useState("");
  const [previewData, setPreviewData] = useState<MailPreview | null>(null);
  const summary = summarizeCounts(status.data?.counts);
  const introError = validateIntro(intro);

  const tableQuery = {
    data: status.data?.rows,
    error: status.error,
    isPending: status.isPending,
    isFetching: status.isFetching,
    refetch: status.refetch,
  };

  async function retryRows(ids?: string[]) {
    try {
      const result = await retry.mutateAsync(ids);
      toast.success(t("retryQueued", { count: result.queued }));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const columns = useMemo(() => {
    const col = createDataTableColumns<MailStatusRow>();
    return col.columns([
      col.display({
        id: "employee",
        header: t("employee"),
        cell: (c) => (
          <span className="min-w-0">
            <span className="block truncate font-medium">{c.row.original.fullName ?? "—"}</span>
            <span className="block font-mono text-xs text-muted-foreground">{c.row.original.employeeCode ?? c.row.original.employeeId.slice(0, 8)}</span>
          </span>
        ),
      }),
      col.accessor("maskedEmail", { header: t("email"), cell: (c) => c.getValue() ?? "—" }),
      col.display({
        id: "status",
        header: t("status"),
        cell: (c) => {
          const row = c.row.original;
          const known = knownMailError(row.error);
          return (
            <span className="space-y-0.5">
              <Badge variant={VARIANT[row.status]}>{t(`state.${row.status}`)}</Badge>
              {row.status === "FAILED" && row.error && (
                <span className="block text-xs text-muted-foreground">{known ? t(`error.${known}`) : row.error}</span>
              )}
            </span>
          );
        },
      }),
      col.accessor("attempts", { header: t("attempts"), cell: (c) => <span className="tabular-nums">{c.getValue()}</span> }),
      col.accessor("sentAt", { header: t("sentAt"), cell: (c) => formatDateTime(c.getValue()) }),
      col.display({
        id: "retry",
        header: () => <span className="sr-only">{t("retryOne")}</span>,
        cell: (c) =>
          canManage && c.row.original.status === "FAILED" ? (
            <Button variant="ghost" size="sm" disabled={retry.isPending} onClick={() => retryRows([c.row.original.employeeId])}>
              {t("retryOne")}
            </Button>
          ) : null,
      }),
    ]);
    // retryRows đổi mỗi lần render; cột chỉ cần đọc trạng thái retry và quyền mới nhất.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, canManage, retry.isPending]);

  const back = (
    <Link href={`/payroll/${month}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeftIcon /> {t("back", { month })}
    </Link>
  );

  if (!valid) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title={t("notFound")} />
      </div>
    );
  }
  if (period.isPending) return <LoadingState />;
  if (period.error) {
    const notFound = isApiError(period.error) && period.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        {notFound ? <EmptyState title={t("notFound")} /> : <ErrorState error={period.error} onRetry={() => period.refetch()} />}
      </div>
    );
  }

  const sendable = canSendMail(period.data.status);

  async function showPreview() {
    try {
      setPreviewData(await preview.mutateAsync(introOrUndefined(intro)));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function sendAll() {
    try {
      const result = await send.mutateAsync(introOrUndefined(intro));
      toast.success(t("queued", { count: result.queued }));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      {back}
      <PageHeader title={t("title", { month })} description={t("description")} />

      {canManage && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          {!sendable && (
            <Alert>
              <LockIcon />
              <AlertDescription>{t("notPublished")}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <Label htmlFor="mail-intro">{t("intro")}</Label>
            <Textarea
              id="mail-intro"
              rows={3}
              value={intro}
              disabled={!sendable}
              aria-invalid={!!introError}
              placeholder={t("introPlaceholder")}
              onChange={(e) => setIntro(e.target.value)}
            />
            <p className={`text-xs tabular-nums ${introError ? "text-destructive" : "text-muted-foreground"}`}>
              {intro.trim().length} / {MAX_INTRO}
              {introError && ` — ${t("introTooLong", { max: MAX_INTRO })}`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{t("noAmounts")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!sendable || !!introError || preview.isPending} onClick={showPreview}>
              {preview.isPending && <Spinner />} {t("preview")}
            </Button>
            <ConfirmDialog
              trigger={<Button disabled={!sendable || !!introError} />}
              triggerLabel={t("sendAll")}
              title={t("confirmTitle", { count: period.data.employees })}
              description={t("confirmDescription")}
              confirmLabel={t("sendAll")}
              onConfirm={sendAll}
            />
            <Button variant="outline" disabled={!sendable || summary.failed === 0 || retry.isPending} onClick={() => retryRows()}>
              {retry.isPending && <Spinner />} {t("retryFailed")}
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-heading text-lg font-semibold">{t("statusTitle")}</h2>
          {status.data && summary.total > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {t("summary", { sent: summary.sent, total: summary.total, failed: summary.failed })}
              {summary.pending > 0 && ` | ${t("summaryPending", { count: summary.pending })}`}
            </p>
          )}
        </div>
        <DataTable
          columns={columns}
          query={tableQuery}
          {...tableState.bind}
          sorting={undefined}
          onSortingChange={undefined}
          getRowId={(row) => row.employeeId}
          empty={<EmptyState title={t("empty")} />}
        />
      </section>

      <Dialog open={previewData !== null} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("previewTitle")}</DialogTitle>
            <DialogDescription>{t("previewDescription")}</DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">{t("subject")}: </span>
                <strong>{previewData.subject}</strong>
              </p>
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-sans">{previewData.body}</pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewData(null)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
