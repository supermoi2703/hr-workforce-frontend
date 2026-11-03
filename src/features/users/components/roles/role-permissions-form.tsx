"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { applyServerFieldErrors } from "@/lib/forms";
import { getUserError } from "../../error-messages";
import { useUpdateRole } from "../../hooks";
import { groupPermissions, permissionMessageKey } from "../../permission-groups";
import { ADMIN_ROLE, isScopeWidening } from "../../role-rules";
import { updateRoleSchema, type UpdateRoleFormValues } from "../../schemas";
import type { PermissionInfo, RoleSummary } from "../../types";
import { DataScopeField } from "./data-scope-field";

type RolePermissionsFormProps = {
  role: RoleSummary;
  permissions: PermissionInfo[];
  /** false: chỉ xem (role ADMIN, hoặc người không có role:manage). */
  editable: boolean;
};

/**
 * Tên, mô tả, phạm vi dữ liệu và quyền của một role (chia nhóm theo phần trước dấu ":"). Lưu = thay TOÀN BỘ quyền,
 * có hiệu lực ngay với mọi người giữ role, nên khi role đang có người giữ mà bỏ bớt quyền hoặc mở rộng phạm vi
 * thì hỏi lại trước.
 */
export function RolePermissionsForm({ role, permissions, editable }: RolePermissionsFormProps) {
  const t = useTranslations("RoleAdmin");
  const tPermission = useTranslations("Permissions");
  const tValidation = useTranslations("RoleAdmin.Validation");
  const tUserErrors = useTranslations("Users.Errors");
  const tErrors = useTranslations("Errors");
  const mutation = useUpdateRole(role.code);

  // ADMIN luôn có mọi quyền: hiện tất cả đã tích (backend trả permissionCodes thật, có thể thiếu quyền mới thêm).
  const savedCodes = useMemo(
    () => (role.code === ADMIN_ROLE ? permissions.map((p) => p.code) : role.permissionCodes),
    [role, permissions],
  );
  const schema = useMemo(() => updateRoleSchema(tValidation), [tValidation]);
  const form = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role.name,
      description: role.description ?? "",
      dataScope: role.dataScope,
      permissionCodes: savedCodes,
    },
  });
  const selected = useWatch({ control: form.control, name: "permissionCodes" });
  const scope = useWatch({ control: form.control, name: "dataScope" });

  // Giá trị chờ xác nhận khi bỏ bớt quyền / mở rộng phạm vi của role đang có người giữ.
  const [pendingValues, setPendingValues] = useState<UpdateRoleFormValues | null>(null);
  const removedCount = savedCodes.filter((code) => !selected.includes(code)).length;
  const widened = isScopeWidening(role.dataScope, scope);

  async function save(values: UpdateRoleFormValues) {
    try {
      await mutation.mutateAsync({
        name: values.name,
        description: values.description || null,
        dataScope: values.dataScope,
        permissionCodes: values.permissionCodes,
      });
      toast.success(t("Detail.saved"));
      form.reset(values); // giá trị vừa lưu thành giá trị gốc mới (nút Lưu tắt lại)
    } catch (error) {
      if (!applyServerFieldErrors(error, form.setError)) {
        toast.error(getUserError(error, tUserErrors, tErrors).message);
      }
      throw error;
    }
  }

  function submit(values: UpdateRoleFormValues) {
    if ((removedCount > 0 || widened) && role.userCount > 0) setPendingValues(values);
    else void save(values).catch(() => {});
  }

  const permissionText = (permission: PermissionInfo, field: "name" | "description") => {
    const key = `${permissionMessageKey(permission.code)}.${field}`;
    // Quyền mới thêm ở backend mà frontend chưa có bản dịch: dùng chữ tiếng Anh từ backend.
    return tPermission.has(key as never) ? tPermission(key as never) : permission[field];
  };
  const scopeLabel = t(`DataScope.${scope}.label`);
  // Nội dung hộp xác nhận theo lý do: bỏ quyền, mở rộng phạm vi, hoặc cả hai.
  const confirmText =
    removedCount > 0 && widened
      ? {
          title: t("Confirm.bothTitle", { name: role.name }),
          description: t("Confirm.bothDescription", { count: removedCount, scope: scopeLabel, people: role.userCount }),
        }
      : widened
        ? {
            title: t("Confirm.widenTitle", { name: role.name }),
            description: t("Confirm.widenDescription", { scope: scopeLabel, people: role.userCount }),
          }
        : {
            title: t("Confirm.removeTitle", { count: removedCount, name: role.name }),
            description: t("Confirm.removeDescription", { people: role.userCount }),
          };
  const groupLabel = (key: string) => (t.has(`groups.${key}` as never) ? t(`groups.${key}` as never) : key);

  const { errors, isDirty } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="flex max-w-2xl flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="role-name">{t("Detail.name")}</FieldLabel>
          <Input id="role-name" disabled={!editable} aria-invalid={!!errors.name} className="bg-card" {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="role-description">{t("Detail.description")}</FieldLabel>
          <Textarea
            id="role-description"
            rows={2}
            disabled={!editable}
            aria-invalid={!!errors.description}
            className="bg-card"
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
        <Controller
          control={form.control}
          name="dataScope"
          render={({ field }) => (
            <DataScopeField id="role-data-scope" value={field.value} onChange={field.onChange} disabled={!editable} />
          )}
        />
      </FieldGroup>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base font-semibold">{t("Detail.permissions")}</h2>
        <Controller
          control={form.control}
          name="permissionCodes"
          render={({ field }) => (
            <div className="flex flex-col gap-4">
              {groupPermissions(permissions).map((group) => (
                <fieldset key={group.key} className="overflow-hidden rounded-xl border bg-card">
                  <legend className="sr-only">{groupLabel(group.key)}</legend>
                  <div aria-hidden className="border-b px-4 py-2.5 text-sm font-medium">
                    {groupLabel(group.key)}
                  </div>
                  <ul className="divide-y">
                    {group.permissions.map((permission) => (
                      <li key={permission.code}>
                        <label className="flex items-start gap-3 px-4 py-3 has-disabled:cursor-default">
                          <Checkbox
                            className="mt-0.5"
                            disabled={!editable}
                            checked={field.value.includes(permission.code)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, permission.code]
                                  : field.value.filter((code) => code !== permission.code),
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{permissionText(permission, "name")}</span>
                            <span className="block text-xs text-muted-foreground">
                              {permissionText(permission, "description")}
                            </span>
                            <code className="block font-mono text-xs text-muted-foreground">{permission.code}</code>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </div>
          )}
        />
      </section>

      {mutation.isError && !errors.name && !errors.description && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{getUserError(mutation.error, tUserErrors, tErrors).message}</AlertDescription>
        </Alert>
      )}

      {editable && (
        <div className="flex gap-2">
          <Button type="submit" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {t("Detail.save")}
          </Button>
          <Button type="button" variant="outline" disabled={!isDirty || mutation.isPending} onClick={() => form.reset()}>
            {t("Detail.discard")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendingValues !== null}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title={confirmText.title}
        description={confirmText.description}
        confirmLabel={t("Confirm.removeConfirm")}
        destructive
        onConfirm={() => (pendingValues ? save(pendingValues) : undefined)}
      />
    </form>
  );
}
