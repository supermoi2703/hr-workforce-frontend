import { addDays, dayNumber, timelineSpan, type TimelineSpan } from "../allocation-rules";

// Thang thời gian dùng chung cho Gantt dự án và lịch tải (workload bước 5). Ngày dạng "yyyy-MM-dd", so sánh được bằng
// chuỗi. Vị trí tính bằng % bề rộng trục để trục co giãn theo màn hình.

export const ZOOMS = ["week", "month", "quarter"] as const;
export type Zoom = (typeof ZOOMS)[number];

/** Số ngày mỗi mức phóng to cho thấy. Backend cho tối đa 26 tuần (182 ngày). */
export const ZOOM_DAYS: Record<Zoom, number> = { week: 14, month: 70, quarter: 182 };
/** Bước lùi / tới của nút ‹ ›. */
const ZOOM_STEP: Record<Zoom, number> = { week: 7, month: 28, quarter: 91 };

export function parseZoom(value: string | null): Zoom {
  return ZOOMS.includes(value as Zoom) ? (value as Zoom) : "month";
}

/** Thứ Hai của tuần chứa ngày `iso` (null nếu không phải ngày). */
export function mondayOf(iso: string): string | null {
  const day = dayNumber(iso);
  if (day === null) return null;
  // 1970-01-01 là thứ Năm: (day + 3) % 7 = số ngày kể từ thứ Hai.
  return addDays(iso, -(((day + 3) % 7) + 7) % 7);
}

export type TimelineWindow = { from: string; to: string };

/**
 * Khoảng đang xem: `from` hợp lệ trên URL thì giữ, không thì mức Tuần bắt đầu từ thứ Hai tuần này, mức khác từ thứ Hai
 * tuần trước (để thấy cả việc vừa trễ).
 */
export function timelineWindow(zoom: Zoom, from: string | null, today: string): TimelineWindow {
  const monday = mondayOf(today) ?? today;
  const start = from !== null && dayNumber(from) !== null ? from : zoom === "week" ? monday : (addDays(monday, -7) ?? monday);
  return { from: start, to: addDays(start, ZOOM_DAYS[zoom] - 1) ?? start };
}

/** Ngày bắt đầu mới sau khi bấm ‹ (-1) hoặc › (1). */
export function shiftedFrom(from: string, zoom: Zoom, direction: -1 | 1): string {
  return addDays(from, direction * ZOOM_STEP[zoom]) ?? from;
}

export type Column = { date: string; leftPercent: number; widthPercent: number; weekend: boolean };

/** Cột của trục: mức Tuần mỗi ngày một cột, mức khác mỗi tuần (từ thứ Hai) một cột, cắt theo khoảng. */
export function columns(window: TimelineWindow, zoom: Zoom): Column[] {
  const result: Column[] = [];
  if (zoom === "week") {
    for (let day: string | null = window.from; day !== null && day <= window.to; day = addDays(day, 1)) {
      const span = timelineSpan(day, day, window.from, window.to);
      const index = dayNumber(day);
      if (span && index !== null) {
        const weekday = (index + 3) % 7; // 0 = thứ Hai
        result.push({ date: day, leftPercent: span.leftPercent, widthPercent: span.widthPercent, weekend: weekday >= 5 });
      }
    }
    return result;
  }
  for (let week: string | null = mondayOf(window.from); week !== null && week <= window.to; week = addDays(week, 7)) {
    const end = addDays(week, 6);
    const span = end === null ? null : timelineSpan(week, end, window.from, window.to);
    if (span) result.push({ date: week, leftPercent: span.leftPercent, widthPercent: span.widthPercent, weekend: false });
  }
  return result;
}

/** Vị trí thanh việc; việc chỉ có hạn (`start` null) vẽ như một ngày. Null nếu nằm ngoài trục. */
export function barSpan(start: string | null, end: string, window: TimelineWindow): TimelineSpan | null {
  return timelineSpan(start ?? end, end, window.from, window.to);
}

/** Phần trễ: từ sau hạn tới hết hôm nay, cắt theo trục. Null nếu chưa trễ hoặc ngoài trục. */
export function overdueSpan(end: string, today: string, window: TimelineWindow): TimelineSpan | null {
  const first = addDays(end, 1);
  if (first === null || first > today) return null;
  return timelineSpan(first, today, window.from, window.to);
}

/** Số ngày trễ tính tới hôm nay (0 nếu chưa trễ). */
export function lateDays(end: string, today: string): number {
  const due = dayNumber(end);
  const now = dayNumber(today);
  return due === null || now === null ? 0 : Math.max(0, now - due);
}

/** Mốc tháng trong khoảng, gồm cả tháng của ngày đầu: nhãn tháng của đầu trục. */
export type MonthBand = { key: string; month: number; year: number; leftPercent: number; widthPercent: number };

export function monthBands(window: TimelineWindow): MonthBand[] {
  const bands: MonthBand[] = [];
  let [year, month] = window.from.split("-").map(Number);
  let start = window.from;
  while (start <= window.to) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const next = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    const last = next > window.to ? window.to : (addDays(next, -1) ?? window.to);
    const span = timelineSpan(start, last, window.from, window.to);
    if (span) bands.push({ key: start, month, year, leftPercent: span.leftPercent, widthPercent: span.widthPercent });
    start = next;
    month = nextMonth;
    year = nextYear;
  }
  return bands;
}
