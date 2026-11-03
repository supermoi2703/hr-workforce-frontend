"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_VALUE_LENGTH } from "../schemas";
import type { DurationUnit } from "../types";

const DURATION_UNITS: DurationUnit[] = ["SECONDS", "MINUTES", "HOURS"];

type PolicyValueInputProps = {
  id: string;
  /** Kiểu dùng để nhập (effectiveValueType). */
  valueType: string;
  value: string;
  onChange: (value: string) => void;
  unit: DurationUnit;
  onUnitChange: (unit: DurationUnit) => void;
  invalid: boolean;
  /** id của dòng mô tả / lỗi bên dưới, cho trình đọc màn hình. */
  describedBy?: string;
};

/** Một ô nhập theo kiểu của khóa: số, giờ (HH:mm), thời lượng (số + đơn vị), Có / Không, chữ. */
export function PolicyValueInput({
  id,
  valueType,
  value,
  onChange,
  unit,
  onUnitChange,
  invalid,
  describedBy,
}: PolicyValueInputProps) {
  const t = useTranslations("Policies");
  const common = { id, "aria-invalid": invalid, "aria-describedby": describedBy };

  if (valueType === "BOOLEAN") {
    const items = { true: t("units.yes"), false: t("units.no") };
    return (
      <Select value={value || null} onValueChange={(next) => onChange(String(next))} items={items}>
        <SelectTrigger {...common} className="w-full sm:w-40">
          <SelectValue placeholder={t("Add.choose")} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (valueType === "DURATION") {
    const items = Object.fromEntries(DURATION_UNITS.map((u) => [u, t(`Add.unit.${u}`)]));
    return (
      <div className="flex gap-2">
        <Input
          {...common}
          inputMode="numeric"
          autoComplete="off"
          className="w-28 tabular-nums"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Select value={unit} onValueChange={(next) => onUnitChange(String(next) as DurationUnit)} items={items}>
          <SelectTrigger className="w-32" aria-label={t("Add.unitLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {items[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (valueType === "TIME") {
    return (
      <Input
        {...common}
        type="time"
        step={60}
        className="w-36 tabular-nums"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const numeric = valueType === "INTEGER" || valueType === "DECIMAL";
  return (
    <Input
      {...common}
      inputMode={valueType === "INTEGER" ? "numeric" : valueType === "DECIMAL" ? "decimal" : undefined}
      autoComplete="off"
      maxLength={MAX_VALUE_LENGTH}
      className={numeric ? "w-40 tabular-nums" : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
