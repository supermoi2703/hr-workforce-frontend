"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { useKpiError } from "../hooks";
import { initialKpiMonth, MONTH_PATTERN } from "../rules";
import type { PeriodStatus, ReviewStatus } from "../types";

export type KpiPageProps = { initialMonth: string };

export function useKpiMonth(initialMonth: string) {
  const months = useSearchParams().getAll("month");
  const selected = months.length === 1 ? months[0] : undefined;
  const month = selected === "" ? "" : initialKpiMonth(selected ?? undefined, initialMonth);
  return {
    month,
    valid: MONTH_PATTERN.test(month),
    changeMonth(value: string) {
      if (value === "" || MONTH_PATTERN.test(value)) {
        const url = new URL(window.location.href);
        url.searchParams.set("month", value);
        window.history.replaceState(null, "", url);
      }
    },
  };
}

export function KpiHeader({ screen, month, changeMonth, children }: {
  screen: "ratings" | "reviews" | "mine" | "manage";
  month: string;
  changeMonth: (month: string) => void;
  children?: ReactNode;
}) {
  const t = useTranslations("Kpi");
  return (
    <PageHeader title={t(`screen.${screen}`)} actions={
      <>
        <Input type="month" className="w-auto" min="2000-01" max="2200-12" aria-label={t("month")}
          value={month} onChange={(event) => changeMonth(event.target.value)} />
        {children}
      </>
    } />
  );
}

export function KpiStatus({ status }: { status: PeriodStatus | ReviewStatus | null }) {
  const t = useTranslations("Kpi.status");
  const variant = status === "LOCKED" ? "success" : status === "OPEN" || !status ? "secondary" : "info";
  return <Badge variant={variant}>{t(status ?? "NONE")}</Badge>;
}

export function KpiPeriodLine({ status, deadline }: { status: PeriodStatus | null; deadline?: string }) {
  const t = useTranslations("Kpi");
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <KpiStatus status={status} />
      {deadline && <span className="text-muted-foreground">{t("deadline", { date: formatDate(deadline) })}</span>}
    </div>
  );
}

export function KpiErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  const message = useKpiError();
  const t = useTranslations("Common");
  const tStates = useTranslations("States");
  return <EmptyState title={tStates("errorTitle")} description={message(error)} className="border border-dashed"
    action={<Button variant="outline" size="sm" onClick={retry}>{t("retry")}</Button>} />;
}
