"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { getUserError } from "../../error-messages";
import { useCreateRole } from "../../hooks";
import { createRoleSchema, type CreateRoleFormValues } from "../../schemas";

const FORM_ID = "create-role-form";

/**
 * Nút "Tạo vai trò" + hộp thoại: chỉ nhập mã, tên, mô tả. Tạo với danh sách quyền rỗng rồi chuyển sang trang chi tiết
 * để tích quyền (form quyền đầy đủ nằm ở đó, không dồn vào hộp thoại).
 */
export function CreateRoleDialog() {
  const t = useTranslations("RoleAdmin");
  const tValidation = useTranslations("RoleAdmin.Validation");
  const tUserErrors = useTranslations("Users.Errors");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const schema = useMemo(() => createRoleSchema(tValidation), [tValidation]);
  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "" },
  });
  const mutation = useCreateRole();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  function submit(values: CreateRoleFormValues) {
    mutation.mutate(
      { ...values, description: values.description || null, permissionCodes: [] },
      {
        onSuccess: (role) => {
          toast.success(t("Create.success", { name: role.name }));
          handleOpenChange(false);
          router.push(`/admin/roles/${encodeURIComponent(role.code)}`);
        },
        onError: (error) => {
          if (applyServerFieldErrors(error, form.setError)) return;
          const { field, message } = getUserError(error, tUserErrors, tErrors);
          if (field === "code") form.setError("code", { type: "server", message }, { shouldFocus: true });
        },
      },
    );
  }

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
            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="create-role-code">{t("Create.code")}</FieldLabel>
              <Input
                id="create-role-code"
                autoComplete="off"
                placeholder="ACCOUNTANT"
                className="font-mono uppercase placeholder:normal-case"
                aria-invalid={!!errors.code}
                {...form.register("code")}
              />
              <FieldDescription>{t("Create.codeHint")}</FieldDescription>
              <FieldError errors={[errors.code]} />
            </Field>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="create-role-name">{t("Create.name")}</FieldLabel>
              <Input id="create-role-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="create-role-description">{t("Create.descriptionLabel")}</FieldLabel>
              <Textarea
                id="create-role-description"
                rows={3}
                aria-invalid={!!errors.description}
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
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
