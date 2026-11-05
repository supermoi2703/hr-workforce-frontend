"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseQueryResult } from "@tanstack/react-query";
import { CircleAlertIcon, EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { applyServerFieldErrors } from "@/lib/forms";
import { formatDate, todayIsoDate } from "@/lib/format";
import { getEmployeeError, hasFieldErrors } from "../error-messages";
import { useUpdateSensitive } from "../hooks";
import { maskSensitive } from "../rules";
import { sensitiveSchema, sensitiveToForm, toSensitiveRequest, type SensitiveFormValues } from "../schemas";
import type { SensitiveInfo } from "../types";

/** Số giấy tờ / tài khoản: che mặc định, chỉ hiện 4 số cuối. */
const SECRET_FIELDS = ["nationalId", "taxCode", "socialInsuranceNo", "bankAccountNo"] as const;

type SensitiveSectionProps = {
  query: UseQueryResult<SensitiveInfo>;
  /** Có = HR sửa được (employee:sensitive); không = chỉ xem (hồ sơ của tôi). */
  employeeId?: string;
};

/**
 * Thông tin nhạy cảm: CCCD, mã số thuế, BHXH, ngân hàng, người phụ thuộc. Số giấy tờ hiện dạng che, bấm "Hiện" mới
 * thấy đủ (tránh lộ khi chia sẻ màn hình). Chỉ HR và chính nhân viên xem được; nhân viên chỉ xem.
 */
export function SensitiveSection({ query, employeeId }: SensitiveSectionProps) {
  const t = useTranslations("Employees.Sensitive");
  const tFields = useTranslations("Employees.Fields");
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const info = query.data;
  const empty = <span className="text-muted-foreground">{t("notProvided")}</span>;
  const text = (value: string | null) => value || empty;
  const secret = (value: string | null) =>
    value ? <span className="font-mono tabular-nums">{revealed ? value : maskSensitive(value)}</span> : empty;
  const hasSecret = SECRET_FIELDS.some((field) => info[field]);

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{employeeId ? t("description") : t("readOnlyHint")}</p>
        <div className="flex items-center gap-2">
          {hasSecret && (
            <Button variant="ghost" size="sm" onClick={() => setRevealed((value) => !value)} aria-pressed={revealed}>
              {revealed ? <EyeOffIcon /> : <EyeIcon />}
              {revealed ? t("hide") : t("show")}
            </Button>
          )}
          {employeeId && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <PencilIcon /> {t("edit")}
            </Button>
          )}
        </div>
      </div>

      <DetailList>
        <DetailRow label={tFields("nationalId")}>{secret(info.nationalId)}</DetailRow>
        <DetailRow label={tFields("nationalIdIssuedOn")}>
          {info.nationalIdIssuedOn ? formatDate(info.nationalIdIssuedOn) : empty}
        </DetailRow>
        <DetailRow label={tFields("nationalIdIssuedPlace")}>{text(info.nationalIdIssuedPlace)}</DetailRow>
        <DetailRow label={tFields("taxCode")}>{secret(info.taxCode)}</DetailRow>
        <DetailRow label={tFields("socialInsuranceNo")}>{secret(info.socialInsuranceNo)}</DetailRow>
        <DetailRow label={tFields("bankName")}>{text(info.bankName)}</DetailRow>
        <DetailRow label={tFields("bankAccountNo")}>{secret(info.bankAccountNo)}</DetailRow>
        <DetailRow label={tFields("bankAccountHolder")}>{text(info.bankAccountHolder)}</DetailRow>
        <DetailRow label={tFields("taxDependents")}>{info.taxDependents}</DetailRow>
      </DetailList>

      {employeeId && (
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            {editing && <SensitiveForm employeeId={employeeId} info={info} onDone={() => setEditing(false)} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const FORM_ID = "employee-sensitive-form";

function SensitiveForm({ employeeId, info, onDone }: { employeeId: string; info: SensitiveInfo; onDone: () => void }) {
  const t = useTranslations("Employees.Sensitive");
  const tFields = useTranslations("Employees.Fields");
  const tValidation = useTranslations("Employees.Validation");
  const tEmployeeErrors = useTranslations("Employees.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const today = todayIsoDate();

  const schema = useMemo(() => sensitiveSchema(tValidation, today), [tValidation, today]);
  const form = useForm<SensitiveFormValues>({ resolver: zodResolver(schema), defaultValues: sensitiveToForm(info) });
  const mutation = useUpdateSensitive(employeeId);

  function submit(values: SensitiveFormValues) {
    mutation.mutate(toSensitiveRequest(values, info.version), {
      onSuccess: () => {
        toast.success(t("saved"));
        onDone();
      },
      onError: (error) => {
        applyServerFieldErrors(error, form.setError);
      },
    });
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getEmployeeError(mutation.error, tEmployeeErrors, tErrors) : null;
  const { errors } = form.formState;

  const input = (
    name: keyof SensitiveFormValues,
    options: { numeric?: boolean; type?: string; max?: string; className?: string } = {},
  ) => (
    <Field data-invalid={!!errors[name]} className={options.className}>
      <FieldLabel htmlFor={`sensitive-${name}`}>{tFields(name)}</FieldLabel>
      <Input
        id={`sensitive-${name}`}
        type={options.type ?? "text"}
        inputMode={options.numeric ? "numeric" : undefined}
        max={options.max}
        autoComplete="off"
        aria-invalid={!!errors[name]}
        {...form.register(name)}
      />
      <FieldError errors={[errors[name]]} />
    </Field>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {input("nationalId", { numeric: true })}
        {input("nationalIdIssuedOn", { type: "date", max: today })}
        {input("nationalIdIssuedPlace", { className: "sm:col-span-2" })}
        {input("taxCode", { numeric: true })}
        {input("socialInsuranceNo", { numeric: true })}
        {input("bankName")}
        {input("bankAccountNo", { numeric: true })}
        {input("bankAccountHolder")}
        {input("taxDependents", { type: "number", numeric: true })}
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
