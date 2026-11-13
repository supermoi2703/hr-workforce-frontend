"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconTile, type DomainTone } from "@/components/shared/icon-tile";
import { cn } from "@/lib/utils";

export type PendingSource = "worklog" | "timesheet" | "payroll";

type StatTileProps = {
  label: string;
  icon: LucideIcon;
  tone: DomainTone;
  /** null kèm `pending` = nguồn chưa có: hiện "Chờ dữ liệu" thay vì số. */
  value: ReactNode | null;
  detail?: ReactNode;
  pending?: PendingSource;
  href?: string;
  /** Trạng thái cần chú ý (vd. có người quá tải): chữ phụ dùng màu cảnh báo kèm nhãn, không chỉ màu. */
  alert?: boolean;
  className?: string;
};

/** Thẻ trắng một số liệu: nhãn, số lớn, chú thích; "Chờ dữ liệu" khi nguồn chưa có. */
export function StatTile({ label, icon, tone, value, detail, pending, href, alert, className }: StatTileProps) {
  const t = useTranslations("Dashboard.Common");
  const waiting = value === null && pending !== undefined;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <IconTile icon={icon} tone={tone} className="size-8" />
      </div>
      {waiting ? (
        <div className="grid gap-0.5">
          <span className="text-base font-medium text-muted-foreground">{t("pending")}</span>
          <span className="text-xs text-muted-foreground">
            {t("pendingHint", { source: t(`sources.${pending}`) })}
          </span>
        </div>
      ) : (
        <div className="grid min-w-0 gap-0.5">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {detail && (
            <span className={cn("truncate text-xs", alert ? "font-medium text-destructive" : "text-muted-foreground")}>
              {detail}
            </span>
          )}
        </div>
      )}
    </>
  );

  const classes = cn("grid content-between gap-3 rounded-xl border bg-card p-4", className);
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:bg-muted/40")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
