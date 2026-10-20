"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DeviceRow } from "@/components/shared/device-row";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { getUserError } from "../error-messages";
import { useForceLogout, useUserSessions } from "../hooks";
import type { UserSummary } from "../types";

type UserSessionsSectionProps = {
  user: UserSummary;
  /** Có quyền và được phép buộc user này đăng xuất (getUserActions().forceLogout). */
  canForceLogout: boolean;
};

/** Thiết bị đang đăng nhập của một tài khoản (session:read-all) + nút buộc đăng xuất mọi thiết bị (user:lock). */
export function UserSessionsSection({ user, canForceLogout }: UserSessionsSectionProps) {
  const t = useTranslations("Users");
  const tUserErrors = useTranslations("Users.Errors");
  const tErrors = useTranslations("Errors");
  const query = useUserSessions(user.id, true);
  const forceLogout = useForceLogout();

  async function signOutEverywhere() {
    try {
      await forceLogout.mutateAsync(user.id);
      toast.success(t("Toasts.signedOutEverywhere"));
    } catch (error) {
      toast.error(getUserError(error, tUserErrors, tErrors).message);
      throw error; // giữ hộp xác nhận mở
    }
  }

  const sessions = query.data ?? [];

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{t("Sessions.title")}</h2>
        {canForceLogout && sessions.length > 0 && (
          <ConfirmDialog
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={t("Sessions.forceLogout")}
            title={t("Confirm.forceLogoutTitle", { name: user.displayName })}
            description={t("Confirm.forceLogoutDescription")}
            confirmLabel={t("Sessions.forceLogout")}
            onConfirm={signOutEverywhere}
          />
        )}
      </div>

      {query.isPending ? (
        <LoadingState className="py-6" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Sessions.empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {sessions.map((session) => (
            <DeviceRow
              key={session.id}
              userAgent={session.userAgent}
              ipAddress={session.ipAddress}
              lastActiveAt={session.lastActiveAt}
              expiresAt={session.expiresAt}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
