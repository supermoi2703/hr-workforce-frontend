"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TransferStatus } from "../types";

const STATUS_VARIANT: Record<TransferStatus, "warning" | "info" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "info",
  APPLIED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
  CANCELLED: "secondary",
};

/** Trạng thái điều chuyển, cùng màu ở mọi màn hình. */
export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const t = useTranslations("Transfers.statuses");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}
