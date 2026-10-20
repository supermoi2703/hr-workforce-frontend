"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/lib/auth/types";

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PENDING: "warning",
  LOCKED: "destructive",
  DISABLED: "secondary",
};

/** Trạng thái tài khoản (PENDING / ACTIVE / LOCKED / DISABLED), cùng màu và nhãn ở mọi màn hình. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslations("UserStatus");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}
