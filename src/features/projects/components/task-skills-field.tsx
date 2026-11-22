"use client";

import type { KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SkillOption, TaskSkillInput } from "../work-types";

const LEVELS = [1, 2, 3, 4, 5] as const;

type TaskSkillsFieldProps = {
  value: TaskSkillInput[];
  onChange: (skills: TaskSkillInput[]) => void;
  /** Danh mục kỹ năng; chỉ kỹ năng đang dùng mới thêm được. */
  options: SkillOption[];
  labelledBy?: string;
};

/**
 * Kỹ năng việc cần, mỗi kỹ năng một mức tối thiểu 1–5 chọn trực tiếp bằng ô vuông (bấm lại ô đang chọn = bỏ mức, tức
 * "chỉ cần có kỹ năng"). Bản gọn của LevelPicker trang Kỹ năng (feature khác, không import chéo được).
 */
export function TaskSkillsField({ value, onChange, options, labelledBy }: TaskSkillsFieldProps) {
  const t = useTranslations("ProjectWork");
  const names = new Map(options.map((option) => [option.id, option.name]));
  const chosen = new Set(value.map((skill) => skill.skillId));
  const addable = options.filter((option) => option.active && !chosen.has(option.id));

  const setLevel = (skillId: string, minLevel: number | null) =>
    onChange(value.map((skill) => (skill.skillId === skillId ? { ...skill, minLevel } : skill)));

  return (
    <div className="grid gap-2" aria-labelledby={labelledBy}>
      {value.length === 0 && <p className="text-sm text-muted-foreground">{t("noSkills")}</p>}
      {value.length > 0 && (
        <ul className="grid gap-1.5">
          {value.map((skill) => {
            const name = names.get(skill.skillId) ?? t("unknownSkill");
            return (
              <li key={skill.skillId} className="flex min-w-0 items-center gap-2 rounded-lg border bg-card py-1.5 pr-1 pl-3 sm:gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                <LevelBoxes name={name} level={skill.minLevel} onChange={(level) => setLevel(skill.skillId, level)} />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("removeSkill", { name })}
                  onClick={() => onChange(value.filter((item) => item.skillId !== skill.skillId))}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {addable.length > 0 && (
        <ChoiceSelect
          value=""
          onChange={(skillId) => skillId && onChange([...value, { skillId, minLevel: 2 }])}
          choices={addable.map((option) => ({ value: option.id, label: option.name }))}
          placeholder={t("addSkill")}
          ariaLabel={t("addSkill")}
          className="sm:w-64"
        />
      )}
    </div>
  );
}

/** Năm ô mức như radio: mũi tên trái / phải đổi mức, bấm lại ô đang chọn thì bỏ mức. */
function LevelBoxes({ name, level, onChange }: { name: string; level: number | null; onChange: (level: number | null) => void }) {
  const t = useTranslations("ProjectWork");
  const focusable = level ?? 1;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = Math.min(Math.max(current + delta, 1), 5);
    onChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-level="${next}"]`)?.focus();
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">{level ? t("minLevel") : t("anyLevel")}</span>
      <span role="radiogroup" aria-label={t("minLevelAria", { name })} className="flex gap-0.5 sm:gap-1">
        {LEVELS.map((step) => {
          const selected = level === step;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={selected}
              data-level={step}
              tabIndex={step === focusable ? 0 : -1}
              onClick={() => onChange(selected ? null : step)}
              onKeyDown={(event) => onKeyDown(event, step)}
              className={cn(
                "flex size-6 items-center justify-center rounded-md border sm:size-7 text-xs font-semibold tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selected ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {step}
            </button>
          );
        })}
      </span>
    </span>
  );
}
