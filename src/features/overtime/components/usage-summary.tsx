"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDuration } from "../hooks";
import { usagePercent } from "../rules";
import type { OvertimeUsage } from "../types";

/** Đã dùng so với trần tháng và năm (40 / 200 giờ theo luật, là tham số ở backend). */
export function UsageSummary({ usage }: { usage: OvertimeUsage }) {
  const t = useTranslations("Overtime.usage");
  const duration = useDuration();
  const rows = [
    { key: "month", used: usage.usedMonthMinutes, cap: usage.monthCapMinutes },
    { key: "year", used: usage.usedYearMinutes, cap: usage.yearCapMinutes },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => {
        const percent = usagePercent(row.used, row.cap);
        const over = row.used > row.cap;
        return (
          <Card key={row.key} size="sm">
            <CardHeader>
              <CardDescription>{t(row.key)}</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {t("usedOfCap", { used: duration(row.used), cap: duration(row.cap) })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={t(row.key)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className={cn("h-full", over ? "bg-destructive" : percent >= 80 ? "bg-pending" : "bg-primary")} style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {over ? t("over") : t("left", { left: duration(Math.max(0, row.cap - row.used)) })}
              </p>
            </CardContent>
          </Card>
        );
      })}
      {!usage.enforceCaps && <p className="text-xs text-muted-foreground sm:col-span-2">{t("notEnforced")}</p>}
    </div>
  );
}
