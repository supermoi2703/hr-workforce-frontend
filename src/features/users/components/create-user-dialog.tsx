"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { applyServerFieldErrors } from "@/lib/forms";
import { getUserError } from "../error-messages";
import { useCreateUser, useRoleLabel, useRoles } from "../hooks";
import { createUserSchema, type CreateUserFormValues } from "../schemas";

const FORM_ID = "create-user-form";

/**
 * Nút "Tạo tài khoản" + hộp thoại. Tài khoản mới ở trạng thái PENDING; backend gửi email kích hoạt.
 * Chọn vai trò chỉ khi có role:assign (không có thì backend tự gán EMPLOYEE); role ADMIN chỉ ADMIN mới thấy.
 */
export function CreateUserDialog() {
  const t = useTranslations("Users");
  const tValidation = useTranslations("Users.Validation");
  const tUserErrors = useTranslations("Users.Errors");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const { hasPermission, hasRole } = useCurrentUser();
  const canAssignRoles = hasPermission("role:assign");
  const roles = useRoles();
  const roleLabel = useRoleLabel();
  const [open, setOpen] = useState(false);

  const schema = useMemo(() => createUserSchema(tValidation), [tValidation]);
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", displayName: "", roleCodes: [] },
  });
  const mutation = useCreateUser();

  const roleOptions = (roles.data ?? []).filter((role) => role.code !== "ADMIN" || hasRole("ADMIN"));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  function submit(values: CreateUserFormValues) {
    mutation.mutate(
      { ...values, roleCodes: canAssignRoles ? values.roleCodes : [] },
      {
        onSuccess: (_, sent) => {
          toast.success(t("Create.success", { email: sent.email }));
          handleOpenChange(false);
        },
        onError: (error) => {
          if (applyServerFieldErrors(error, form.setError)) return;
          const { field, message } = getUserError(error, tUserErrors, tErrors);
          if (field === "email") form.setError("email", { type: "server", message }, { shouldFocus: true });
        },
      },
    );
  }

  // Lỗi đã gắn vào ô thì không hiện thêm Alert.
  const formError =
    mutation.isError && !(isApiError(mutation.error) && mutation.error.fieldErrors.length > 0)
      ? getUserError(mutation.error, tUserErrors, tErrors)
      : null;
  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> {t("List.create")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Create.title")}</DialogTitle>
          <DialogDescription>{t("Create.description")}</DialogDescription>
        </DialogHeader>

        {formError && !formError.field && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError.message}</AlertDescription>
          </Alert>
        )}

        <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="create-user-email">{t("Create.email")}</FieldLabel>
              <Input
                id="create-user-email"
                type="email"
                autoComplete="off"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.displayName}>
              <FieldLabel htmlFor="create-user-name">{t("Create.displayName")}</FieldLabel>
              <Input
                id="create-user-name"
                autoComplete="off"
                aria-invalid={!!errors.displayName}
                {...form.register("displayName")}
              />
              <FieldError errors={[errors.displayName]} />
            </Field>

            {canAssignRoles ? (
              <Field>
                <FieldTitle>{t("Create.roles")}</FieldTitle>
                {roles.isPending ? (
                  <Spinner />
                ) : (
                  <Controller
                    control={form.control}
                    name="roleCodes"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {roleOptions.map((role) => (
                          <label key={role.code} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.value.includes(role.code)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, role.code]
                                    : field.value.filter((code) => code !== role.code),
                                )
                              }
                            />
                            {roleLabel(role.code)}
                          </label>
                        ))}
                      </div>
                    )}
                  />
                )}
                <FieldDescription>{t("Create.rolesHint")}</FieldDescription>
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Create.defaultRole")}</p>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {t("Create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
