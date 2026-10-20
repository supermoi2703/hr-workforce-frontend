"use client";

import { useState } from "react";
import {
  BanIcon,
  ChevronDownIcon,
  EllipsisIcon,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  MailIcon,
  UserCheckIcon,
  UserCogIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import type { UserStatusAction } from "../api";
import { getUserError } from "../error-messages";
import { useForceLogout, useResendActivation, useUserStatusAction } from "../hooks";
import type { UserSummary } from "../types";
import { getUserActions, hasAnyUserAction } from "../user-actions";
import { AssignRolesDialog } from "./assign-roles-dialog";

/** Thao tác cần hỏi lại trước khi làm (khó hoàn tác hoặc ảnh hưởng người đang dùng). */
type ConfirmAction = "lock" | "disable" | "enable" | "forceLogout";

const STATUS_TOAST = {
  lock: "locked",
  unlock: "unlocked",
  disable: "disabled",
  enable: "enabled",
} as const satisfies Record<UserStatusAction, string>;

type UserActionsMenuProps = {
  user: UserSummary;
  /** "row": nút … trong bảng; "page": nút "Thao tác" ở trang chi tiết. */
  variant: "row" | "page";
};

/**
 * Menu thao tác trên một tài khoản. Chỉ hiện mục được phép theo getUserActions (quyền + trạng thái + quy tắc
 * bảo vệ); không có mục nào thì không render. Hộp xác nhận / gán vai trò nằm ngoài menu (menu đóng trước).
 */
export function UserActionsMenu({ user, variant }: UserActionsMenuProps) {
  const t = useTranslations("Users");
  const tUserErrors = useTranslations("Users.Errors");
  const tErrors = useTranslations("Errors");
  const { user: actor } = useCurrentUser();
  // Tách "thao tác nào" và "đang mở": đóng hộp thoại chỉ đổi `confirmOpen`, nội dung giữ nguyên tới khi hiệu ứng đóng xong.
  const [confirming, setConfirming] = useState<ConfirmAction>("lock");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const askConfirm = (action: ConfirmAction) => {
    setConfirming(action);
    setConfirmOpen(true);
  };
  const [assigningRoles, setAssigningRoles] = useState(false);

  const statusAction = useUserStatusAction();
  const resend = useResendActivation();
  const forceLogout = useForceLogout();

  if (!actor) return null;
  const actions = getUserActions(user, actor);
  if (!hasAnyUserAction(actions)) return null;

  const name = user.displayName;
  const showError = (error: unknown) => toast.error(getUserError(error, tUserErrors, tErrors).message);

  async function changeStatus(action: UserStatusAction) {
    try {
      await statusAction.mutateAsync({ id: user.id, action });
      toast.success(t(`Toasts.${STATUS_TOAST[action]}`));
    } catch (error) {
      showError(error);
      throw error; // giữ hộp xác nhận mở để thử lại
    }
  }

  async function confirm() {
    if (confirming === "forceLogout") {
      try {
        await forceLogout.mutateAsync(user.id);
        toast.success(t("Toasts.signedOutEverywhere"));
      } catch (error) {
        showError(error);
        throw error;
      }
    } else {
      await changeStatus(confirming);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "row" ? (
              <Button variant="ghost" size="icon-sm" aria-label={t("Actions.openMenu", { name })} />
            ) : (
              <Button variant="outline" size="sm" />
            )
          }
        >
          {variant === "row" ? (
            <EllipsisIcon />
          ) : (
            <>
              {t("Actions.menu")} <ChevronDownIcon />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {actions.unlock && (
            <DropdownMenuItem onClick={() => void changeStatus("unlock").catch(() => {})}>
              <LockOpenIcon /> {t("Actions.unlock")}
            </DropdownMenuItem>
          )}
          {actions.lock && (
            <DropdownMenuItem onClick={() => askConfirm("lock")}>
              <LockIcon /> {t("Actions.lock")}
            </DropdownMenuItem>
          )}
          {actions.assignRoles && (
            <DropdownMenuItem onClick={() => setAssigningRoles(true)}>
              <UserCogIcon /> {t("Actions.assignRoles")}
            </DropdownMenuItem>
          )}
          {actions.resendActivation && (
            <DropdownMenuItem
              onClick={() =>
                resend.mutate(user.id, {
                  onSuccess: () => toast.success(t("Toasts.activationSent")),
                  onError: showError,
                })
              }
            >
              <MailIcon /> {t("Actions.resendActivation")}
            </DropdownMenuItem>
          )}
          {actions.forceLogout && (
            <DropdownMenuItem onClick={() => askConfirm("forceLogout")}>
              <LogOutIcon /> {t("Actions.forceLogout")}
            </DropdownMenuItem>
          )}
          {(actions.enable || actions.disable) && <DropdownMenuSeparator />}
          {actions.enable && (
            <DropdownMenuItem onClick={() => askConfirm("enable")}>
              <UserCheckIcon /> {t("Actions.enable")}
            </DropdownMenuItem>
          )}
          {actions.disable && (
            <DropdownMenuItem variant="destructive" onClick={() => askConfirm("disable")}>
              <BanIcon /> {t("Actions.disable")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t(`Confirm.${confirming}Title`, { name })}
        description={t(`Confirm.${confirming}Description`)}
        confirmLabel={t(`Actions.${confirming}`)}
        destructive={confirming === "lock" || confirming === "disable"}
        onConfirm={confirm}
      />

      {actions.assignRoles && (
        <AssignRolesDialog user={user} open={assigningRoles} onOpenChange={setAssigningRoles} />
      )}
    </>
  );
}
