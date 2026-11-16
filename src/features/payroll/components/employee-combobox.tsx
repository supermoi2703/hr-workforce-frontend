"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEmployeeSearch } from "../hooks";
import type { EmployeeOption } from "../types";

type EmployeeComboboxProps = {
  id?: string;
  value: EmployeeOption | null;
  onChange: (employee: EmployeeOption | null) => void;
  invalid?: boolean;
};

/** Ô tìm nhân viên theo mã hoặc tên (GET /api/employees, trong phạm vi dữ liệu). Hiện "mã — họ tên". */
export function EmployeeCombobox({ id, value, onChange, invalid }: EmployeeComboboxProps) {
  const t = useTranslations("Payroll.inputs");
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const keyword = useDebouncedValue(text.trim());
  const search = useEmployeeSearch(keyword, open);
  const options = search.data?.content ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
        <span className="truncate">
          <span className="font-mono text-xs">{value.employeeCode}</span> — {value.fullName}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("employeeClear")} onClick={() => onChange(null)}>
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={text}
        placeholder={t("employeeSearch")}
        autoComplete="off"
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && keyword.length >= 2 && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
          {search.isFetching && options.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">{t("employeeLoading")}</li>
          ) : options.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">{t("employeeNone")}</li>
          ) : (
            options.map((option) => (
              <li key={option.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ id: option.id, employeeCode: option.employeeCode, fullName: option.fullName });
                    setText("");
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-xs">{option.employeeCode}</span> — {option.fullName}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
