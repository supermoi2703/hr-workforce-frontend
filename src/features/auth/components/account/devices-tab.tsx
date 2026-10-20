"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DeviceRow } from "@/components/shared/device-row";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { revokeSession } from "../../api";
import { accountKeys, useMySessions } from "../../hooks";

/** Đăng xuất một phiên; phiên đã hết hạn / đã bị thu hồi (404) cũng coi như xong. */
async function revokeIgnoringGone(id: string): Promise<void> {
  try {
    await revokeSession(id);
  } catch (error) {
    if (!(isApiError(error) && error.status === 404)) throw error;
  }
}

/** Thiết bị đang đăng nhập: máy này luôn ở đầu; đăng xuất từng máy khác hoặc tất cả máy khác. */
export function DevicesTab() {
  const t = useTranslations("Account.Devices");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const query = useMySessions();

  const refresh = () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions });

  const revokeOne = useMutation({
    mutationFn: revokeIgnoringGone,
    onSuccess: () => {
      toast.success(t("signedOut"));
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const sessions = [...query.data].sort((a, b) => Number(b.current) - Number(a.current));
  const others = sessions.filter((session) => !session.current);

  async function signOutOthers() {
    try {
      await Promise.all(others.map((session) => revokeIgnoringGone(session.id)));
      toast.success(t("signedOutOthers"));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error; // giữ hộp thoại mở để thử lại
    } finally {
      void refresh();
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {others.length > 0 && (
          <ConfirmDialog
            trigger={<Button variant="outline" size="sm" className="shrink-0" />}
            triggerLabel={t("signOutOthers")}
            title={t("signOutOthersTitle")}
            description={t("signOutOthersDescription")}
            confirmLabel={t("signOutOthers")}
            destructive
            onConfirm={signOutOthers}
          />
        )}
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {sessions.map((session) => {
          const signingOut = revokeOne.isPending && revokeOne.variables === session.id;
          return (
            <DeviceRow
              key={session.id}
              userAgent={session.userAgent}
              ipAddress={session.ipAddress}
              lastActiveAt={session.lastActiveAt}
              trailing={
                session.current ? (
                  <Badge variant="success">{t("thisDevice")}</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => revokeOne.mutate(session.id)} disabled={signingOut}>
                    {signingOut && <Spinner />}
                    {t("signOut")}
                  </Button>
                )
              }
            />
          );
        })}
      </ul>

      {others.length === 0 && <p className="text-sm text-muted-foreground">{t("onlyThisDevice")}</p>}
    </div>
  );
}
