"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PayrollPeriodStatus } from "../types";

const VARIANT: Record<PayrollPeriodStatus, "info" | "secondary" | "warning" | "success" | "outline"> = {
  OPEN: "info",
  LOCKED: "secondary",
  CALCULATED: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  CLOSED: "outline",
};

export function PeriodStatusBadge({ status }: { status: PayrollPeriodStatus }) {
  const t = useTranslations("Payroll.status");
  return <Badge variant={VARIANT[status] ?? "outline"}>{t(status)}</Badge>;
}
