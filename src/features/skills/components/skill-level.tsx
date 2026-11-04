"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { skillStatus } from "../rules";
import { SKILL_LEVELS, type EmployeeSkill, type SkillLevel } from "../types";

/** Năm vạch, tô đến mức hiện có. `title` đọc được tên mức khi rê chuột. */
export function LevelMeter({ level, className }: { level: number; className?: string }) {
  const t = useTranslations("Skills.Levels");
  const safe = Math.min(Math.max(Math.round(level), 1), 5) as SkillLevel;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={t("aria", { level: safe, name: t(`${safe}.name`) })}
      title={`${safe} · ${t(`${safe}.name`)}`}
    >
      {SKILL_LEVELS.map((step) => (
        <span key={step} className={cn("h-2 w-3 rounded-sm", step <= safe ? "bg-primary" : "bg-muted-foreground/20")} />
      ))}
    </span>
  );
}

/** Vạch + "3 · Thành thạo". */
export function LevelLabel({ level, className }: { level: number; className?: string }) {
  const t = useTranslations("Skills.Levels");
  const safe = Math.min(Math.max(Math.round(level), 1), 5) as SkillLevel;
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <LevelMeter level={safe} />
      <span className="text-sm tabular-nums">
        {safe} · {t(`${safe}.name`)}
      </span>
    </span>
  );
}

const STATUS_VARIANT = {
  pending: "warning",
  confirmed: "success",
  adjusted: "info",
  addedByManager: "success",
} as const;

export function SkillStatusBadge({ skill }: { skill: Pick<EmployeeSkill, "confirmed" | "selfLevel" | "confirmedLevel"> }) {
  const t = useTranslations("Skills.Status");
  const status = skillStatus(skill);
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}

type LevelPickerProps = {
  value: number | null;
  onChange: (level: SkillLevel) => void;
  /** Đánh dấu một mức để đối chiếu (vd mức nhân viên tự khai khi quản lý chốt mức khác). */
  markedLevel?: number | null;
  markedLabel?: string;
  invalid?: boolean;
  labelledBy?: string;
};

/**
 * Chọn mức 1–5, mỗi mức có mô tả "làm được gì" (docs/policies/skill.md mục 2) để người khai chọn theo việc làm được,
 * không theo cảm nhận. Phím mũi tên lên / xuống đổi mức như radio.
 */
export function LevelPicker({ value, onChange, markedLevel, markedLabel, invalid, labelledBy }: LevelPickerProps) {
  const t = useTranslations("Skills.Levels");
  const focusable = value ?? 1;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, level: SkillLevel) {
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = Math.min(Math.max(level + delta, 1), 5) as SkillLevel;
    onChange(next);
    const group = event.currentTarget.parentElement;
    group?.querySelector<HTMLButtonElement>(`[data-level="${next}"]`)?.focus();
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalid} className="flex flex-col gap-1.5">
      {SKILL_LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            data-level={level}
            tabIndex={level === focusable ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(event) => onKeyDown(event, level)}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected ? "border-primary bg-primary/5" : "hover:bg-muted/60",
              invalid && !value && "border-destructive/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {level}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {t(`${level}.name`)}
                {markedLevel === level && markedLabel && <Badge variant="outline">{markedLabel}</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">{t(`${level}.description`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
