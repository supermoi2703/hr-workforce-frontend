"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYROLL_STEPS, sortedLog, stepState, stepStamp } from "../status";
import type { PeriodDetail } from "../types";

/** Chỉ có id người thao tác (backend chưa trả tên), nên hiện 8 ký tự đầu. */
const shortId = (id: string | null) => (id ? id.slice(0, 8) : null);

export function PeriodStepper({ period }: { period: PeriodDetail }) {
  const t = useTranslations("Payroll");
  const tStatus = useTranslations("Payroll.status");

  return (
    <ol className="grid gap-3 sm:grid-cols-6" aria-label={t("stepper.title")}>
      {PAYROLL_STEPS.map((step, index) => {
        const state = stepState(step, period.status);
        const stamp = stepStamp(period, step);
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "rounded-lg border p-3 text-sm",
              state === "current" && "border-primary bg-primary/5",
              state === "upcoming" && "text-muted-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "current" && "border-primary text-primary",
                )}
              >
                {state === "done" ? <CheckIcon className="size-3" /> : index + 1}
              </span>
              <span className={cn(state === "current" ? "font-semibold" : "font-medium")}>{tStatus(step)}</span>
            </div>
            {stamp && (
              <p className="mt-2 text-xs text-muted-foreground">
                <time>{formatDateTime(stamp.at)}</time>
                {stamp.by && <span className="block">{t("stepper.by", { id: shortId(stamp.by) ?? "" })}</span>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StatusLog({ period }: { period: PeriodDetail }) {
  const t = useTranslations("Payroll.log");
  const tStatus = useTranslations("Payroll.status");
  const entries = sortedLog(period.statusLog);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-baseline sm:gap-4">
          <time className="shrink-0 text-muted-foreground sm:w-44">{formatDateTime(entry.at)}</time>
          <span className="font-medium">
            {entry.from ? t("transition", { from: tStatus(entry.from), to: tStatus(entry.to) }) : t("created", { to: tStatus(entry.to) })}
          </span>
          {entry.actorUserId && <span className="text-xs text-muted-foreground">{t("by", { id: shortId(entry.actorUserId) ?? "" })}</span>}
          {entry.reason && <span className="text-muted-foreground">{entry.reason}</span>}
        </li>
      ))}
    </ul>
  );
}
