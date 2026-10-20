"use client";

import Link from "next/link";
import { ArrowLeftIcon, InfoIcon, UserXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { RequireAccess } from "@/components/shared/require-access";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { useRoleLabel, useUser } from "../hooks";
import { getUserActions } from "../user-actions";
import { EditUserDialog } from "./edit-user-dialog";
import { UserActionsMenu } from "./user-actions-menu";
import { UserSessionsSection } from "./user-sessions-section";

const LIST_PATH = "/admin/users";

/** Chi tiết một tài khoản: thông tin, thao tác quản trị (theo quyền), thiết bị đang đăng nhập. */
export function UserDetailPage({ id }: { id: string }) {
  const t = useTranslations("Users");
  const roleLabel = useRoleLabel();
  const { user: actor } = useCurrentUser();
  const query = useUser(id);

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("Detail.back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    // id sai định dạng (400) hoặc không tồn tại (404): báo "không tìm thấy" thay vì lỗi chung.
    const notFound = isApiError(query.error) && (query.error.status === 404 || query.error.status === 400);
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<UserXIcon />}
            title={t("Detail.notFound")}
            description={t("Detail.notFoundDescription")}
            className="border border-dashed"
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  const user = query.data;
  const actions = actor ? getUserActions(user, actor) : null;
  const dateOrDash = (value: string | null) =>
    value ? <time dateTime={value}>{formatDateTime(value)}</time> : null;

  return (
    <>
      {backLink}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user.displayName} seed={user.id} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">{user.displayName}</h1>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RequireAccess access={{ permissions: ["user:update"] }} fallback={null}>
            <EditUserDialog user={user} />
          </RequireAccess>
          <UserActionsMenu user={user} variant="page" />
        </div>
      </div>

      {/* Quy tắc bảo vệ của backend: giải thích vì sao không có thao tác thay vì để người dùng bấm rồi mới bị từ chối. */}
      {actions?.blocked && (
        <Alert className="max-w-2xl">
          <InfoIcon />
          <AlertDescription>
            {actions.blocked === "self" ? (
              <>
                {t("Blocked.self")}{" "}
                <Link href="/account" className="font-medium">
                  {t("Blocked.selfLink")}
                </Link>
                .
              </>
            ) : (
              t("Blocked.adminProtected")
            )}
          </AlertDescription>
        </Alert>
      )}

      <DetailList className="max-w-2xl">
        <DetailRow label={t("Detail.email")}>
          <span className="break-all">{user.email}</span>
        </DetailRow>
        <DetailRow label={t("Detail.status")}>
          <UserStatusBadge status={user.status} />
        </DetailRow>
        <DetailRow label={t("Detail.roles")}>
          <span className="flex flex-wrap gap-1.5">
            {user.roles.map((code) => (
              <Badge key={code} variant="secondary">
                {roleLabel(code)}
              </Badge>
            ))}
          </span>
        </DetailRow>
        <DetailRow label={t("Detail.createdAt")}>{dateOrDash(user.createdAt)}</DetailRow>
        <DetailRow label={t("Detail.lastLogin")}>
          {dateOrDash(user.lastLoginAt) ?? <span className="text-muted-foreground">{t("List.never")}</span>}
        </DetailRow>
        <DetailRow label={t("Detail.emailVerified")}>
          {dateOrDash(user.emailVerifiedAt) ?? (
            <span className="text-muted-foreground">{t("Detail.notVerified")}</span>
          )}
        </DetailRow>
      </DetailList>

      {actions?.viewSessions && <UserSessionsSection user={user} canForceLogout={actions.forceLogout} />}
    </>
  );
}
