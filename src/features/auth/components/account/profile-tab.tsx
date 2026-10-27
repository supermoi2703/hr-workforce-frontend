"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { ROLES, type RoleCode } from "@/lib/auth/types";

/** Thông tin tài khoản (chỉ xem: backend chưa có API sửa hồ sơ). Lấy từ phiên đăng nhập, không gọi thêm API. */
export function ProfileTab() {
  const t = useTranslations("Account.Profile");
  const tRole = useTranslations("Roles");
  const { user } = useCurrentUser();
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-3">
      <DetailList>
        <DetailRow label={t("name")}>
          <span className="flex items-center gap-3">
            <UserAvatar name={user.displayName} seed={user.id} />
            <span className="truncate font-medium">{user.displayName}</span>
          </span>
        </DetailRow>
        <DetailRow label={t("email")}>
          <span className="break-all">{user.email}</span>
        </DetailRow>
        <DetailRow label={t("roles")}>
          <span className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {/* Role tự tạo (ngoài 4 role hệ thống) chưa có bản dịch: hiện nguyên mã. */}
                {ROLES.includes(role as RoleCode) ? tRole(role as RoleCode) : role}
              </Badge>
            ))}
          </span>
        </DetailRow>
        <DetailRow label={t("status")}>
          <UserStatusBadge status={user.status} />
        </DetailRow>
      </DetailList>
      <p className="text-sm text-muted-foreground">{t("note")}</p>
    </div>
  );
}
