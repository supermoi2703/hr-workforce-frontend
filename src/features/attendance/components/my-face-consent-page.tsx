"use client";

import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { useAcceptMyFaceConsent, useAttendanceErrorMessage, useMyFaceConsent, useRequestMyFaceConsentWithdrawal } from "../hooks";

export function MyFaceConsentPage() {
  const t = useTranslations("FaceConsent");
  const locale = useLocale();
  const employeeId = useCurrentUser().user?.employeeId ?? null;
  const consent = useMyFaceConsent(employeeId);
  const accept = useAcceptMyFaceConsent(employeeId);
  const withdrawal = useRequestMyFaceConsentWithdrawal(employeeId);
  const errorMessage = useAttendanceErrorMessage();

  async function requestWithdrawal() {
    accept.reset();
    try {
      await withdrawal.mutateAsync();
    } catch {
      // Đóng xác nhận để hiện lỗi ngay trong trang.
    }
  }

  const data = consent.data;
  const error = accept.error ?? withdrawal.error;
  const working = accept.isPending || withdrawal.isPending || consent.isFetching;

  return (
    <>
      <PageHeader title={t("title")} />
      {consent.isPending ? <LoadingState /> : consent.isError ? (
        <ErrorState error={consent.error} onRetry={() => consent.refetch()} />
      ) : data && (
        <div className="max-w-3xl space-y-5">
          <div className="space-y-2 rounded-xl border p-4" aria-live="polite">
            <Badge variant={data.status === "CURRENT" ? "success" : data.status === "WITHDRAWAL_REQUESTED" ? "warning" : "secondary"}>
              {t(`status.${data.status}`)}
            </Badge>
            {data.consentedAt && data.status !== "WITHDRAWN" && (
              <p className="text-sm text-muted-foreground">{data.consentedVersion === null
                ? t("acceptedAt", { date: formatDateTime(data.consentedAt) })
                : t("acceptedVersionAt", { version: data.consentedVersion, date: formatDateTime(data.consentedAt) })}</p>
            )}
            {data.status === "WITHDRAWAL_REQUESTED" && (
              <p className="text-sm text-muted-foreground">{t("withdrawalPending")}</p>
            )}
            {data.withdrawnAt && <p className="text-sm text-muted-foreground">{t("withdrawnAt", { date: formatDateTime(data.withdrawnAt) })}</p>}
          </div>

          <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="consent-version">
            <h2 id="consent-version" className="font-medium">{t("currentVersion", { version: data.currentVersion })}</h2>
            <div lang={locale} className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {locale === "vi" ? data.contentVi : data.contentEn}
            </div>
          </section>

          {error && <Alert variant="destructive"><AlertDescription>{errorMessage(error)}</AlertDescription></Alert>}

          <div className="flex flex-wrap gap-3">
            {data.status !== "CURRENT" && data.status !== "WITHDRAWAL_REQUESTED" && (
              <Button disabled={working} onClick={() => { withdrawal.reset(); accept.mutate(data.currentVersion); }}>
                {accept.isPending && <Spinner />}{t("accept")}
              </Button>
            )}
            {data.canRequestWithdrawal && (
              <ConfirmDialog
                trigger={<Button variant="outline" disabled={working} />}
                triggerLabel={t("requestWithdrawal")}
                title={t("withdrawalTitle")}
                description={t("withdrawalDescription")}
                confirmLabel={t("requestWithdrawal")}
                onConfirm={requestWithdrawal}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
