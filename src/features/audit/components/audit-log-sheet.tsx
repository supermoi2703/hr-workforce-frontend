"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { formatDateTime } from "@/lib/format";
import { formatDevice } from "@/lib/user-agent";
import { useActionLabel, useMetadataLabels } from "../hooks";
import { formatMetadata } from "../metadata";
import type { AuditLogEntry } from "../types";

type AuditLogSheetProps = {
  entry: AuditLogEntry | null;
  onClose: () => void;
};

/** Link sang trang quản trị của đối tượng (tài khoản / vai trò). */
function targetHref(target: AuditLogEntry["target"]): string | null {
  if (!target?.id) return null;
  if (target.type === "USER") return `/admin/users/${encodeURIComponent(target.id)}`;
  if (target.type === "ROLE") return `/admin/roles/${encodeURIComponent(target.id)}`;
  return null;
}

/** Chi tiết một dòng nhật ký, trượt từ bên phải: người thực hiện, đối tượng, thiết bị và metadata dễ đọc. */
export function AuditLogSheet({ entry, onClose }: AuditLogSheetProps) {
  const t = useTranslations("AuditLog");
  const tDevices = useTranslations("Devices");
  const actionLabel = useActionLabel();
  const metadataLabels = useMetadataLabels();

  // Giữ dòng vừa xem trong lúc hiệu ứng đóng chạy (entry đã về null) để nội dung không biến mất giữa chừng.
  const [shown, setShown] = useState(entry);
  if (entry && entry !== shown) setShown(entry);
  if (!shown) return null;

  const href = targetHref(shown.target);
  const rows = formatMetadata(shown.metadata, metadataLabels);
  const categoryLabel = t.has(`categories.${shown.category}` as never)
    ? t(`categories.${shown.category}` as never)
    : shown.category;

  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{actionLabel(shown.action)}</SheetTitle>
          <SheetDescription>
            <time dateTime={shown.createdAt}>{formatDateTime(shown.createdAt)}</time>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <DetailList>
            <DetailRow label={t("Sheet.result")}>
              <Badge variant={shown.outcome === "SUCCESS" ? "success" : "destructive"}>{t(`outcomes.${shown.outcome}`)}</Badge>
            </DetailRow>
            <DetailRow label={t("Sheet.category")}>{categoryLabel}</DetailRow>
            <DetailRow label={t("Sheet.actor")}>
              <span className="break-all">{shown.actor?.email ?? t("List.system")}</span>
            </DetailRow>
            <DetailRow label={t("Sheet.target")}>
              {shown.target ? (
                <span className="flex flex-col items-start gap-1">
                  <span className="break-all">{shown.target.label ?? shown.target.id ?? "—"}</span>
                  {href && (
                    <Link href={href} className={buttonVariants({ variant: "link", size: "xs", className: "h-auto px-0" })}>
                      {shown.target.type === "ROLE" ? t("Sheet.openRole") : t("Sheet.openAccount")}
                    </Link>
                  )}
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label={t("Sheet.ip")}>{shown.ipAddress ?? "—"}</DetailRow>
            <DetailRow label={t("Sheet.device")}>
              <span className="flex flex-col gap-1">
                <span>{formatDevice(shown.userAgent, tDevices("unknownDevice"))}</span>
                {shown.userAgent && (
                  <code className="font-mono text-xs break-all text-muted-foreground">{shown.userAgent}</code>
                )}
              </span>
            </DetailRow>
          </DetailList>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("Sheet.details")}</h3>
            {rows.length > 0 ? (
              <DetailList>
                {rows.map((row) => (
                  <DetailRow key={row.key} label={row.label}>
                    <span className="break-all">{row.value}</span>
                  </DetailRow>
                ))}
              </DetailList>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Sheet.noDetails")}</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
