"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { getUserError } from "../error-messages";
import { useAssignRoles, useRoleLabel, useRoles } from "../hooks";
import type { UserSummary } from "../types";

type AssignRolesDialogProps = {
  user: UserSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Thay toàn bộ vai trò của một tài khoản (PUT /api/users/{id}/roles, quyền role:assign). Phải giữ ít nhất 1 vai trò;
 * vai trò ADMIN chỉ ADMIN mới thấy (backend: ADMIN_ACCOUNT_PROTECTED).
 */
export function AssignRolesDialog({ user, open, onOpenChange }: AssignRolesDialogProps) {
  const t = useTranslations("Users");
  const tUserErrors = useTranslations("Users.Errors");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const { hasRole } = useCurrentUser();
  const roles = useRoles();
  const roleLabel = useRoleLabel();
  const mutation = useAssignRoles();

  const [selected, setSelected] = useState<string[]>(user.roles);
  const [showRequired, setShowRequired] = useState(false);

  // Mỗi lần mở lại: bắt đầu từ vai trò hiện tại (có thể vừa đổi ở nơi khác).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelected(user.roles);
      setShowRequired(false);
      mutation.reset();
    }
  }

  const options = (roles.data ?? []).filter((role) => role.code !== "ADMIN" || hasRole("ADMIN"));

  function toggle(code: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, code] : current.filter((value) => value !== code)));
  }

  function save() {
    if (selected.length === 0) {
      setShowRequired(true);
      return;
    }
    mutation.mutate(
      { id: user.id, roleCodes: selected },
      {
        onSuccess: () => {
          toast.success(t("Toasts.rolesChanged"));
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("AssignRoles.title")}</DialogTitle>
          <DialogDescription>{t("AssignRoles.description", { name: user.displayName })}</DialogDescription>
        </DialogHeader>

        {roles.isPending ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {options.map((role) => (
                <label key={role.code} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(role.code)}
                    onCheckedChange={(checked) => toggle(role.code, checked === true)}
                  />
                  {roleLabel(role.code)}
                </label>
              ))}
            </div>
            {showRequired && selected.length === 0 && <FieldError>{t("AssignRoles.required")}</FieldError>}
            {mutation.isError && <FieldError>{getUserError(mutation.error, tUserErrors, tErrors).message}</FieldError>}
            <FieldDescription>{t("AssignRoles.note")}</FieldDescription>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
          <Button onClick={save} disabled={mutation.isPending || roles.isPending}>
            {mutation.isPending && <Spinner />}
            {t("AssignRoles.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
