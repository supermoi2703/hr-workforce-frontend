import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** 7 ngày (yyyy-MM-dd) của tuần chứa `isoDate`, bắt đầu từ thứ Hai. */
export function weekOf(isoDate: string): string[] {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(date);
    day.setUTCDate(date.getUTCDate() - mondayOffset + i);
    return day.toISOString().slice(0, 10);
  });
}

type WeekStripProps = {
  /** Hôm nay, dạng yyyy-MM-dd theo giờ Việt Nam. */
  today: string;
  /**
   * Nội dung nhỏ dưới mỗi ngày, theo ngày yyyy-MM-dd. Dành cho module chấm công / nghỉ phép / lịch
   * văn phòng gắn trạng thái (vd. <Badge variant="success">8h</Badge>, "Nghỉ lễ").
   */
  dayContent?: Record<string, ReactNode>;
  className?: string;
};

/** Dải 7 ngày của tuần hiện tại, ô hôm nay tô màu thương hiệu. */
export function WeekStrip({ today, dayContent = {}, className }: WeekStripProps) {
  const days = weekOf(today);

  return (
    <ol aria-label="Tuần này" className={cn("grid grid-cols-7 gap-1.5 sm:gap-2", className)}>
      {days.map((day, index) => {
        const isToday = day === today;
        const isWeekend = index >= 5;

        return (
          <li
            key={day}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex min-h-20 flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 text-center",
              isToday ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              isWeekend && !isToday && "border-transparent bg-muted text-muted-foreground",
            )}
          >
            <span className={cn("text-xs", !isToday && "text-muted-foreground")}>{WEEKDAY_LABELS[index]}</span>
            <time dateTime={day} className="text-lg leading-7 font-semibold">
              {Number(day.slice(8, 10))}
            </time>
            <div className="mt-auto text-[0.7rem] leading-4">{dayContent[day]}</div>
          </li>
        );
      })}
    </ol>
  );
}
