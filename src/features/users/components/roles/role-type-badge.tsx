"use client";

import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ADMIN_ROLE } from "../../role-rules";
import type { RoleSummary } from "../../types";

/** Loại vai trò: Khóa (ADMIN) / Hệ thống / Tự tạo. */
export function RoleTypeBadge({ role }: { role: RoleSummary }) {
  const t = useTranslations("RoleAdmin.Types");
  if (role.code === ADMIN_ROLE) {
    return (
      <Badge variant="outline">
        <LockIcon /> {t("locked")}
      </Badge>
    );
  }
  return role.system ? <Badge variant="secondary">{t("system")}</Badge> : <Badge variant="info">{t("custom")}</Badge>;
}
