"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "../types";

const STATUS_VARIANT: Record<EmployeeStatus, "info" | "success" | "warning" | "secondary"> = {
  ONBOARDING: "info",
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "secondary",
};

/** Trạng thái hồ sơ (đang nhận việc / đang làm / nghỉ dài / đã nghỉ), cùng màu ở mọi màn hình. */
export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const t = useTranslations("Employees.statuses");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}
