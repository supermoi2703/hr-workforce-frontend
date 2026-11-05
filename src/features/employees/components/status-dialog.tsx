"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
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
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { applyServerFieldErrors } from "@/lib/forms";
import { getEmployeeError, hasFieldErrors } from "../error-messages";
import { useChangeEmployeeStatus, useRefreshEmployee } from "../hooks";
import { allowedStatusTransitions } from "../rules";
import { statusSchema, toStatusRequest, type StatusFormValues } from "../schemas";
import type { EmployeeDetail } from "../types";
import { ChoiceSelect } from "./choice-select";

const FORM_ID = "employee-status-form";

type StatusDialogProps = {
  employee: EmployeeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Người này đang là trưởng phòng / trưởng team (cảnh báo EMPLOYEE_IS_UNIT_HEAD sau khi đổi). */
  onUnitHeadWarning: () => void;
};

/**
 * Đổi trạng thái hồ sơ. Chỉ cho chọn trạng thái hợp lệ theo bảng chuyển của backend; nghỉ việc bắt buộc ngày nghỉ
 * (≥ ngày vào làm) và báo trước tác dụng: khóa tài khoản, đăng xuất mọi thiết bị, giao lại các bước duyệt đang chờ.
 */
export function StatusDialog({ employee, open, onOpenChange, onUnitHeadWarning }: StatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && (
          <StatusForm employee={employee} onDone={() => onOpenChange(false)} onUnitHeadWarning={onUnitHeadWarning} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusForm({
  employee,
  onDone,
  onUnitHeadWarning,
}: {
  employee: EmployeeDetail;
  onDone: () => void;
  onUnitHeadWarning: () => void;
}) {
  const t = useTranslations("Employees.Status");
  const tStatus = useTranslations("Employees.statuses");
  const tValidation = useTranslations("Employees.Validation");
  const tEmployeeErrors = useTranslations("Employees.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshEmployee();
  const transitions = allowedStatusTransitions(employee.status);

  const schema = useMemo(() => statusSchema(tValidation, employee.hireDate), [tValidation, employee.hireDate]);
  const form = useForm<StatusFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: transitions.length === 1 ? transitions[0] : "", terminationDate: "", reason: "" },
  });
  const mutation = useChangeEmployeeStatus(employee.id);
  const status = useWatch({ control: form.control, name: "status" });

  function submit(values: StatusFormValues) {
    mutation.mutate(toStatusRequest(values, employee.version), {
      onSuccess: (result) => {
        toast.success(t("success", { status: tStatus(result.employee.status) }));
        if (result.warnings.includes("EMPLOYEE_IS_UNIT_HEAD")) onUnitHeadWarning();
        onDone();
      },
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        const { field, message, stale } = getEmployeeError(error, tEmployeeErrors, tErrors);
        if (field === "terminationDate") form.setError(field, { type: "server", message }, { shouldFocus: true });
        if (stale) void refresh(employee.id);
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getEmployeeError(mutation.error, tEmployeeErrors, tErrors) : null;
  const { errors } = form.formState;
  const warning =
    status === "TERMINATED"
      ? t("terminateWarning")
      : status === "ON_LEAVE"
        ? t("onLeaveWarning")
        : status === "ACTIVE" && employee.status === "TERMINATED"
          ? t("rehireHint")
          : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>
          {t("description", { name: employee.fullName, status: tStatus(employee.status) })}
        </DialogDescription>
      </DialogHeader>

      {formError && !formError.field && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Field data-invalid={!!errors.status}>
                <FieldLabel htmlFor="employee-new-status">{t("newStatus")}</FieldLabel>
                <ChoiceSelect
                  id="employee-new-status"
                  value={field.value}
                  onChange={field.onChange}
                  choices={transitions.map((value) => ({ value, label: tStatus(value) }))}
                  placeholder={t("choose")}
                  invalid={!!errors.status}
                />
                <FieldError errors={[errors.status]} />
              </Field>
            )}
          />

          {status === "TERMINATED" && (
            <Field data-invalid={!!errors.terminationDate}>
              <FieldLabel htmlFor="employee-termination-date">{t("terminationDate")}</FieldLabel>
              <Input
                id="employee-termination-date"
                type="date"
                min={employee.hireDate}
                aria-invalid={!!errors.terminationDate}
                {...form.register("terminationDate")}
              />
              <FieldError errors={[errors.terminationDate]} />
            </Field>
          )}

          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="employee-status-reason">{t("reason")}</FieldLabel>
            <Textarea id="employee-status-reason" rows={2} aria-invalid={!!errors.reason} {...form.register("reason")} />
            <FieldDescription>{t("reasonHint")}</FieldDescription>
            <FieldError errors={[errors.reason]} />
          </Field>

          {warning && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button
          type="submit"
          form={FORM_ID}
          variant={status === "TERMINATED" ? "destructive" : "default"}
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Spinner />}
          {t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
