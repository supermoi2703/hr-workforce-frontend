"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { getUserError } from "../error-messages";
import { useUpdateUser } from "../hooks";
import { updateUserSchema, type UpdateUserFormValues } from "../schemas";
import type { UserDetail } from "../types";

const FORM_ID = "edit-user-form";

/** Nút "Sửa tên" + hộp thoại (PATCH /api/users/{id}, quyền user:update). */
export function EditUserDialog({ user }: { user: UserDetail }) {
  const t = useTranslations("Users");
  const tValidation = useTranslations("Users.Validation");
  const tUserErrors = useTranslations("Users.Errors");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("Errors");
  const [open, setOpen] = useState(false);

  const schema = useMemo(() => updateUserSchema(tValidation), [tValidation]);
  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user.displayName },
  });
  const mutation = useUpdateUser(user.id);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Mở lại thì điền tên hiện tại (có thể vừa đổi ở tab khác).
    if (next) form.reset({ displayName: user.displayName });
    else mutation.reset();
  }

  function submit(values: UpdateUserFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(t("Edit.success"));
        handleOpenChange(false);
      },
      onError: (error) => {
        applyServerFieldErrors(error, form.setError);
      },
    });
  }

  const formError =
    mutation.isError && !(isApiError(mutation.error) && mutation.error.fieldErrors.length > 0)
      ? getUserError(mutation.error, tUserErrors, tErrors)
      : null;
  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon /> {t("Detail.editName")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Edit.title")}</DialogTitle>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError.message}</AlertDescription>
          </Alert>
        )}

        <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.displayName}>
              <FieldLabel htmlFor="edit-user-name">{t("Edit.displayName")}</FieldLabel>
              <Input
                id="edit-user-name"
                autoComplete="off"
                aria-invalid={!!errors.displayName}
                {...form.register("displayName")}
              />
              <FieldError errors={[errors.displayName]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {t("Edit.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
