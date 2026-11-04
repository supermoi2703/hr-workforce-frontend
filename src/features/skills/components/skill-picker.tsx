"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { filterSkills, groupByCategory } from "../rules";
import type { Skill } from "../types";

type SkillPickerProps = {
  /** Kỹ năng được chọn (đã lọc sẵn: vd chỉ kỹ năng đang dùng). */
  skills: Skill[];
  value: Skill | undefined;
  onChange: (skill: Skill) => void;
  /** Kỹ năng không chọn được (đã khai, đã có trong điều kiện tìm...) kèm lý do hiện bên cạnh. */
  disabled?: Map<string, string>;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  className?: string;
};

/** Chọn một kỹ năng trong danh mục: ô tìm (không dấu, theo tên hoặc mã) + danh sách gom theo nhóm. */
export function SkillPicker({ skills, value, onChange, disabled, placeholder, invalid, id, className }: SkillPickerProps) {
  const t = useTranslations("Skills.Picker");
  const tCategory = useTranslations("Skills.Categories");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const groups = useMemo(() => groupByCategory(filterSkills(skills, { text, status: "all" })), [skills, text]);

  function pick(skill: Skill) {
    onChange(skill);
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
            className={cn("w-full justify-between bg-card font-normal", !value && "text-muted-foreground", className)}
          />
        }
      >
        <span className="truncate">{value ? value.name : (placeholder ?? t("placeholder"))}</span>
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
            onKeyDown={(event) => {
              // Enter chọn luôn kết quả đầu tiên chọn được.
              if (event.key !== "Enter") return;
              event.preventDefault();
              const first = groups.flatMap((g) => g.items).find((s) => !disabled?.has(s.id));
              if (first) pick(first);
            }}
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label={t("listLabel")}>
          {groups.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noMatch")}</p>}
          {groups.map((group) => (
            <div key={group.category} role="group" aria-label={tCategory(group.category)} className="pb-1">
              <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{tCategory(group.category)}</p>
              {group.items.map((skill) => {
                const reason = disabled?.get(skill.id);
                const selected = value?.id === skill.id;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={!!reason}
                    onClick={() => pick(skill)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <CheckIcon className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{skill.name}</span>
                    {reason ? (
                      <span className="text-xs text-muted-foreground">{reason}</span>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">{skill.code}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
