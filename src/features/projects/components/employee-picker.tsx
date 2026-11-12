"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { EMPLOYEE_SEARCH_MIN_LENGTH, useEmployeeOptions } from "../hooks";
import type { ProjectPerson } from "../types";

type EmployeePickerProps = {
  value: ProjectPerson | null;
  onChange: (person: ProjectPerson) => void;
  /** Người không chọn được, kèm lý do hiện bên cạnh. */
  disabled?: Map<string, string>;
  invalid?: boolean;
  id?: string;
};

/**
 * Chọn một nhân viên đang làm việc: tìm ở backend theo tên hoặc mã (GET /api/projects/people), vì trưởng phòng role
 * Employee không có quyền employee:read và cây tổ chức chỉ cho thấy phòng mình. Dùng cho PM, người quan sát và đề xuất
 * phân bổ, nên được chọn người phòng khác; phải gõ ít nhất 2 ký tự.
 */
export function EmployeePicker({ value, onChange, disabled, invalid, id }: EmployeePickerProps) {
  const t = useTranslations("Projects.Picker");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const keyword = useDebouncedValue(text.trim());
  const options = useEmployeeOptions(keyword, open);
  const tooShort = keyword.length < EMPLOYEE_SEARCH_MIN_LENGTH;

  function pick(person: ProjectPerson) {
    onChange(person);
    setOpen(false);
    setText("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button
            variant="outline"
            aria-invalid={invalid}
            className={cn("w-full justify-between bg-card font-normal", !value && "text-muted-foreground")}
          />
        }
      >
        <span className="truncate">{value ? `${value.fullName} (${value.employeeCode})` : t("placeholder")}</span>
        <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 gap-0 p-0">
        <div className="relative border-b p-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-8 pl-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1" role="listbox" aria-label={t("listLabel")}>
          {tooShort && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("typeMore")}</p>}
          {!tooShort && options.isPending && (
            <div className="space-y-1 p-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {!tooShort && options.isError && <p className="px-3 py-6 text-center text-sm text-destructive">{t("loadFailed")}</p>}
          {!tooShort && options.data?.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noMatch")}</p>}
          {!tooShort && options.data?.map((person) => {
            const reason = disabled?.get(person.id);
            const selected = value?.id === person.id;
            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={!!reason}
                onClick={() => pick(person)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <UserAvatar name={person.fullName} seed={person.id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{person.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {reason ?? [person.employeeCode, person.position?.name, person.department?.name].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {selected && <CheckIcon className="size-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
