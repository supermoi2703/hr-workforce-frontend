"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CircleCheckIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { isSheetWarning } from "../checks";
import { useWarningLabel } from "../use-warning-label";
import { warningParams } from "../warnings";
import type { CheckItem, PeriodChecks } from "../types";

type ChecksBoxProps = { month: string; checks: PeriodChecks | undefined; loading: boolean };

/** Hộp kiểm tra trước thao tác: đỏ = chặn, vàng = cảnh báo, xanh = không có vấn đề. Không có dữ liệu (backend cũ) thì ẩn. */
export function ChecksBox({ month, checks, loading }: ChecksBoxProps) {
  const t = useTranslations("Payroll.checks");
  const tStatus = useTranslations("Payroll.status");
  const warningLabel = useWarningLabel();

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> {t("loading")}
      </p>
    );
  }
  if (!checks) return null;

  function text(item: CheckItem): ReactNode {
    const count = item.count ?? 0;
    const key = item.code as Parameters<typeof t>[0];
    if (!isSheetWarning(item.code)) {
      const raw = warningParams(item.params);
      const status = typeof raw.status === "string" && tStatus.has(raw.status as never) ? tStatus(raw.status as never) : raw.status;
      const label = t.has(key) ? t(key, { ...raw, ...(status === undefined ? {} : { status }), count }) : item.code;
      return item.code === "TIMESHEET_NOT_LOCKED" ? (
        <>
          {label}{" "}
          <Link href="/timesheets/periods" className="font-medium underline">
            {t("goTimesheets")}
          </Link>
        </>
      ) : (
        label
      );
    }
    return (
      <Link href={`/payroll/${month}?warningType=${encodeURIComponent(item.code)}`} className="underline">
        {t("sheetWarning", { count, label: warningLabel(item) })}
      </Link>
    );
  }

  if (checks.blockers.length === 0 && checks.warnings.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-2 text-sm text-success">
        <CircleCheckIcon className="size-4 shrink-0" /> {t("none")}
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {checks.blockers.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
          {checks.blockers.map((item) => (
            <li key={item.code} className="flex gap-2">
              <OctagonAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>{text(item)}</span>
            </li>
          ))}
        </ul>
      )}
      {checks.warnings.length > 0 && (
        <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2 text-warning">
          {checks.warnings.map((item) => (
            <li key={item.code} className="flex gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>{text(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
