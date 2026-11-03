"use client";

import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DATA_SCOPES, type DataScope } from "../../types";

type DataScopeFieldProps = {
  id: string;
  value: DataScope;
  onChange: (value: DataScope) => void;
  disabled?: boolean;
};

/**
 * Ô chọn phạm vi dữ liệu của role. Dưới ô: mô tả phạm vi đang chọn + lưu ý chung (chỉ áp dụng cho quyền của role,
 * tài khoản chưa gắn hồ sơ nhân viên không thấy gì với SELF / TEAM / OFFICE).
 */
export function DataScopeField({ id, value, onChange, disabled }: DataScopeFieldProps) {
  const t = useTranslations("RoleAdmin.DataScope");
  const items = Object.fromEntries(DATA_SCOPES.map((scope) => [scope, t(`${scope}.label`)]));

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("label")}</FieldLabel>
      <Select value={value} onValueChange={(next) => onChange(next as DataScope)} items={items} disabled={disabled}>
        <SelectTrigger id={id} aria-describedby={`${id}-description ${id}-hint`} className="w-full bg-card sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATA_SCOPES.map((scope) => (
            <SelectItem key={scope} value={scope}>
              {items[scope]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription id={`${id}-description`}>{t(`${value}.description`)}</FieldDescription>
      <FieldDescription id={`${id}-hint`}>{t("hint")}</FieldDescription>
    </Field>
  );
}
