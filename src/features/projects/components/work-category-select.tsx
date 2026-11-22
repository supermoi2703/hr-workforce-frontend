"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMinutes } from "../work-rules";
import { WORK_PHASES, type WorkCategory } from "../work-types";

/** Giá trị nội bộ của "Không chọn nhóm": Select không nhận chuỗi rỗng làm lựa chọn. */
const NONE = "__none__";

type WorkCategorySelectProps = {
  id?: string;
  /** "" = không chọn nhóm. */
  value: string;
  onChange: (category: WorkCategory | null) => void;
  categories: WorkCategory[];
  disabled?: boolean;
};

/**
 * Chọn nhóm công việc, gom theo giai đoạn (phân tích & thiết kế, lập trình, kiểm thử & vận hành), mỗi mục kèm giờ mặc
 * định. Chỉ hiện nhóm đang dùng, trừ nhóm việc đang trỏ tới (ghi "ngừng dùng") để sửa việc cũ không mất nhóm.
 */
export function WorkCategorySelect({ id, value, onChange, categories, disabled }: WorkCategorySelectProps) {
  const t = useTranslations("ProjectWork");
  const visible = categories.filter((category) => category.active || category.id === value);
  const label = (category: WorkCategory) =>
    `${category.name} · ${formatMinutes(category.defaultMinutes)}${category.active ? "" : ` (${t("inactiveCategory")})`}`;
  const items = Object.fromEntries([[NONE, t("noCategory")], ...visible.map((category) => [category.id, label(category)])]);

  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => {
        if (next == null) return;
        onChange(next === NONE ? null : (visible.find((category) => category.id === next) ?? null));
      }}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("noCategory")}</SelectItem>
        {WORK_PHASES.map((phase) => {
          const inPhase = visible.filter((category) => category.phase === phase);
          if (inPhase.length === 0) return null;
          return (
            <SelectGroup key={phase}>
              <SelectLabel>{t(`phase.${phase}`)}</SelectLabel>
              {inPhase.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {label(category)}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
