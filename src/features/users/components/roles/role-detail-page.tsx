"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, InfoIcon, ShieldQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { getUserError } from "../../error-messages";
import { useDeleteRole, usePermissions, useRole, useRoleLabel } from "../../hooks";
import { getRoleRules } from "../../role-rules";
import { RolePermissionsForm } from "./role-permissions-form";
import { RoleTypeBadge } from "./role-type-badge";

const LIST_PATH = "/admin/roles";

/** Chi tiết một vai trò: sửa tên / mô tả / quyền (role:manage), xóa role tự tạo chưa ai giữ. */
export function RoleDetailPage({ code }: { code: string }) {
  const t = useTranslations("RoleAdmin");
  const tUserErrors = useTranslations("Users.Errors");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const { user: actor } = useCurrentUser();
  const roleLabel = useRoleLabel();
  const role = useRole(code);
  const permissions = usePermissions();
  const deleteRole = useDeleteRole();

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("Detail.back")}
    </Link>
  );

  if (role.isPending || permissions.isPending) return <LoadingState />;
  if (role.isError || permissions.isError) {
    const error = role.error ?? permissions.error;
    const notFound = isApiError(role.error) && role.error.status === 404;
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<ShieldQuestionIcon />}
            title={t("Detail.notFound")}
            description={t("Detail.notFoundDescription")}
            className="border border-dashed"
          />
        ) : (
          <ErrorState error={error} onRetry={() => (role.isError ? role.refetch() : permissions.refetch())} />
        )}
      </>
    );
  }
  if (!actor) return null;

  const data = role.data;
  const rules = getRoleRules(data, actor);
  const name = roleLabel(data.code);

  async function remove() {
    try {
      await deleteRole.mutateAsync(data.code);
      toast.success(t("Detail.deleted", { name }));
      router.replace(LIST_PATH);
    } catch (error) {
      toast.error(getUserError(error, tUserErrors, tErrors).message);
      throw error; // giữ hộp xác nhận mở
    }
  }

  return (
    <>
      {backLink}

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{name}</h1>
          <RoleTypeBadge role={data} />
        </div>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono">{data.code}</code> · {t("Detail.people", { count: data.userCount })}
        </p>
      </div>

      {(rules.locked || !rules.canEdit) && (
        <Alert className="max-w-2xl">
          <InfoIcon />
          <AlertDescription>{rules.locked ? t("Detail.lockedNote") : t("Detail.readOnlyNote")}</AlertDescription>
        </Alert>
      )}

      {/* key: khi dữ liệu role đổi (vừa lưu, tab khác sửa) thì form nhận lại giá trị gốc mới. */}
      <RolePermissionsForm
        key={`${data.code}:${data.permissionCodes.join(",")}:${data.name}`}
        role={data}
        permissions={permissions.data}
        editable={rules.canEdit}
      />

      {rules.canDelete ? (
        <div>
          <ConfirmDialog
            trigger={<Button variant="destructive" />}
            triggerLabel={t("Detail.delete")}
            title={t("Confirm.deleteTitle", { name })}
            description={t("Confirm.deleteDescription")}
            confirmLabel={t("Detail.delete")}
            destructive
            onConfirm={remove}
          />
        </div>
      ) : (
        rules.deleteBlocked && (
          <p className="text-sm text-muted-foreground">
            {rules.deleteBlocked === "system"
              ? t("Detail.systemCantDelete")
              : t("Detail.inUseCantDelete", { count: data.userCount })}
          </p>
        )
      )}
    </>
  );
}
