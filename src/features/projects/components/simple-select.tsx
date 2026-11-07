"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SimpleSelectProps = {
  id?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

/** Select một lựa chọn, gọn hơn khi có danh sách value / label sẵn. */
export function SimpleSelect({ id, value, onChange, options, placeholder, disabled, className, size }: SimpleSelectProps) {
  const items = Object.fromEntries(options.map((option) => [option.value, option.label]));
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)} items={items} disabled={disabled}>
      <SelectTrigger id={id} className={className} size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
