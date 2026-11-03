"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { DataScope } from "../../types";

/** Phạm vi dữ liệu của role: Bản thân / Đội / Văn phòng / Toàn công ty. */
export function DataScopeBadge({ scope }: { scope: DataScope }) {
  const t = useTranslations("RoleAdmin.DataScope");
  return <Badge variant={scope === "ALL" ? "secondary" : "outline"}>{t(`${scope}.label`)}</Badge>;
}
