"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { ROLES, type RoleCode, type UserStatus } from "@/lib/auth/types";

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PENDING: "warning",
  LOCKED: "destructive",
  DISABLED: "secondary",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Thông tin tài khoản (chỉ xem: backend chưa có API sửa hồ sơ). Lấy từ phiên đăng nhập, không gọi thêm API. */
export function ProfileTab() {
  const t = useTranslations("Account.Profile");
  const tRole = useTranslations("Roles");
  const { user } = useCurrentUser();
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-3">
      <dl className="divide-y rounded-xl border bg-card text-sm">
        <Row label={t("name")}>
          <span className="flex items-center gap-3">
            <UserAvatar name={user.displayName} seed={user.id} />
            <span className="truncate font-medium">{user.displayName}</span>
          </span>
        </Row>
        <Row label={t("email")}>
          <span className="break-all">{user.email}</span>
        </Row>
        <Row label={t("roles")}>
          <span className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {/* Role tự tạo (ngoài 4 role hệ thống) chưa có bản dịch: hiện nguyên mã. */}
                {ROLES.includes(role as RoleCode) ? tRole(role as RoleCode) : role}
              </Badge>
            ))}
          </span>
        </Row>
        <Row label={t("status")}>
          <Badge variant={STATUS_VARIANT[user.status]}>{t(`statuses.${user.status}`)}</Badge>
        </Row>
      </dl>
      <p className="text-sm text-muted-foreground">{t("note")}</p>
    </div>
  );
}
