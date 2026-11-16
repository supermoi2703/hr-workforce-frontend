"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { useAddInput, usePayrollErrorMessage, useUpdateInput } from "../hooks";
import {
  buildInputBody,
  inputValue,
  isMoneyCode,
  isOvertimeCode,
  validateInput,
  type InputErrors,
  type InputFormValues,
} from "../inputs";
import type { EmployeeOption, PayrollInput, PayrollInputCode } from "../types";
import { EmployeeCombobox } from "./employee-combobox";

type InputFormDialogProps = {
  month: string;
  /** Thêm: danh sách mã chọn được (theo tab đang mở). Sửa: truyền `input`, mã và nhân viên không đổi. */
  codes: PayrollInputCode[];
  input?: PayrollInput;
  onClose: () => void;
  onSaved: () => void;
};

/** Thêm hoặc sửa một dòng khoản nhập. Sửa = backend tạo dòng mới thay dòng cũ (dòng cũ giữ làm vết). */
export function InputFormDialog({ month, codes, input, onClose, onSaved }: InputFormDialogProps) {
  const t = useTranslations("Payroll.inputs");
  const errorMessage = usePayrollErrorMessage();
  const add = useAddInput(month);
  const update = useUpdateInput();
  const editing = !!input;
  const { can } = useCurrentUser();
  // Có employee:read thì tìm theo mã/tên; không thì nhập UUID.
  const canSearch = can({ permissions: ["employee:read"] });
  const [employee, setEmployee] = useState<EmployeeOption | null>(null);
  const [values, setValues] = useState<InputFormValues>({
    employeeId: input?.employeeId ?? "",
    code: input?.code ?? codes[0],
    value: input ? String(inputValue(input) ?? "") : "",
    sourceMonth: input?.adjustSourceMonth ?? "",
    reason: "",
  });
  const [touched, setTouched] = useState(false);
  const pending = add.isPending || update.isPending;
  const errors: InputErrors = touched ? validateInput(values, month, !editing) : {};

  const set = <K extends keyof InputFormValues>(key: K, value: InputFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function save() {
    setTouched(true);
    if (Object.keys(validateInput(values, month, !editing)).length > 0) return;
    const body = buildInputBody(values);
    try {
      if (input) await update.mutateAsync({ id: input.id, body });
      else await add.mutateAsync({ employeeId: values.employeeId.trim(), code: values.code, ...body });
      toast.success(t("saved"));
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const unit = isMoneyCode(values.code) ? t("unitMoney") : isOvertimeCode(values.code) ? t("unitHours") : t("unitCoefficient");
  const fieldError = (key: keyof InputErrors) => (errors[key] ? <p className="text-xs text-destructive">{t(`validation.${errors[key]}`)}</p> : null);

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{editing ? t("editDescription") : t("addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!editing && (
            <div className="space-y-1">
              <Label htmlFor="input-employee">{t("employee")}</Label>
              {canSearch ? (
                <EmployeeCombobox
                  id="input-employee"
                  value={employee}
                  invalid={!!errors.employeeId}
                  onChange={(next) => {
                    setEmployee(next);
                    set("employeeId", next?.id ?? "");
                  }}
                />
              ) : (
                <>
                  <Input
                    id="input-employee"
                    value={values.employeeId}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    aria-invalid={!!errors.employeeId}
                    onChange={(e) => set("employeeId", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("employeeHint")}</p>
                </>
              )}
              {fieldError("employeeId")}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="input-code">{t("code")}</Label>
            {editing || codes.length === 1 ? (
              <p id="input-code" className="text-sm font-medium">
                {t(`codes.${values.code}`)}
              </p>
            ) : (
              <ChoiceSelect
                id="input-code"
                value={values.code}
                onChange={(value) => value && set("code", value as PayrollInputCode)}
                choices={codes.map((code) => ({ value: code, label: t(`codes.${code}`) }))}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="input-value">
              {t("value")} ({unit})
            </Label>
            <Input
              id="input-value"
              inputMode="decimal"
              value={values.value}
              step={isOvertimeCode(values.code) ? 0.5 : undefined}
              aria-invalid={!!errors.value}
              onChange={(e) => set("value", e.target.value)}
            />
            {values.code === "KPI_COEFFICIENT" && <p className="text-xs text-muted-foreground">{t("kpiHint")}</p>}
            {values.code === "ADJUST" && <p className="text-xs text-muted-foreground">{t("adjustHint")}</p>}
            {fieldError("value")}
          </div>

          {values.code === "ADJUST" && (
            <div className="space-y-1">
              <Label htmlFor="input-source">{t("sourceMonth")}</Label>
              <Input
                id="input-source"
                type="month"
                value={values.sourceMonth}
                aria-invalid={!!errors.sourceMonth}
                onChange={(e) => set("sourceMonth", e.target.value)}
              />
              {fieldError("sourceMonth")}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="input-reason">{t("reason")}</Label>
            <Textarea
              id="input-reason"
              rows={3}
              maxLength={1000}
              value={values.reason}
              aria-invalid={!!errors.reason}
              onChange={(e) => set("reason", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
            {fieldError("reason")}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Spinner />} {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
