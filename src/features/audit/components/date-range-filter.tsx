"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";

type DateRangeFilterProps = {
  /** "yyyy-MM-dd" */
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
};

const toIsoDate = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined);

/** Chọn khoảng ngày (tính cả hai đầu). Không chọn được ngày tương lai vì nhật ký chưa có. */
export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const t = useTranslations("AuditLog.Filters");
  const [today] = useState(() => new Date());
  const selected: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined;
  const label = from ? `${formatDate(from)} – ${to ? formatDate(to) : ""}` : t("anyDate");

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger
          render={<Button variant="outline" className="w-full justify-start bg-card font-normal sm:w-60" />}
          aria-label={t("dateRange")}
        >
          <CalendarIcon className="text-muted-foreground" />
          <span className={from ? undefined : "text-muted-foreground"}>{label}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(range) => onChange(toIsoDate(range?.from), toIsoDate(range?.to))}
            disabled={{ after: today }}
            defaultMonth={selected?.from ?? today}
          />
        </PopoverContent>
      </Popover>
      {from && (
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(undefined, undefined)} aria-label={t("removeFilter")}>
          <XIcon />
        </Button>
      )}
    </div>
  );
}
