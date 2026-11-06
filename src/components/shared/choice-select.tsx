"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Choice = { value: string; label: string };

type ChoiceSelectProps = {
  id?: string;
  /** "" = chưa chọn (hiện placeholder) hoặc chọn mục "trống" nếu có `noneLabel`. */
  value: string;
  onChange: (value: string) => void;
  choices: Choice[];
  placeholder?: string;
  /** Có thì thêm mục đầu tiên giá trị "" (vd "Không thuộc team", "Tất cả văn phòng"). */
  noneLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

/** Giá trị nội bộ của mục "trống": Select không nhận chuỗi rỗng làm một lựa chọn. */
const NONE = "__none__";

/** Ô chọn một giá trị từ danh sách (đơn vị tổ chức, level, trạng thái...), dùng cho cả form và bộ lọc. */
export function ChoiceSelect({
  id,
  value,
  onChange,
  choices,
  placeholder,
  noneLabel,
  invalid,
  disabled,
  ariaLabel,
  className,
}: ChoiceSelectProps) {
  const all = noneLabel === undefined ? choices : [{ value: NONE, label: noneLabel }, ...choices];
  const items = Object.fromEntries(all.map((choice) => [choice.value, choice.label]));
  const selected = value === "" ? (noneLabel === undefined ? null : NONE) : value;

  return (
    <Select
      value={selected}
      onValueChange={(next) => {
        if (next === null) return;
        onChange(next === NONE ? "" : String(next));
      }}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} aria-invalid={invalid} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
