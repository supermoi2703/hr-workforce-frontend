// Định dạng hiển thị dùng chung. Luôn hiển thị theo giờ Việt Nam, kể cả khi máy người dùng đặt múi giờ khác.

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const APP_LOCALE = "vi-VN";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  // Chuỗi "yyyy-MM-dd" (LocalDate của backend) là ngày theo lịch, không gắn giờ:
  // đọc như nửa đêm giờ Việt Nam để không bị lệch sang ngày hôm trước.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00+07:00`);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, { style: "currency", currency: "VND" });
const numberFormatter = new Intl.NumberFormat(APP_LOCALE);

/** 13/10/2026 */
export function formatDate(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

/** 13/10/2026, 08:30 */
export function formatDateTime(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

/** 08:30 */
export function formatTime(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

/** 15.000.000 ₫ */
export function formatCurrency(value: number | null | undefined, fallback = "—"): string {
  return value === null || value === undefined ? fallback : currencyFormatter.format(value);
}

/** 1.000 */
export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  return value === null || value === undefined ? fallback : numberFormatter.format(value);
}
