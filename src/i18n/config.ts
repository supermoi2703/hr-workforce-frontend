/** Ngôn ngữ giao diện. Thêm ngôn ngữ: thêm mã ở đây + file messages/<mã>.json + nhãn trong LOCALE_LABELS. */
export const LOCALES = ["en", "vi"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

/** Cookie lưu ngôn ngữ người dùng chọn (server đọc khi render nên không bị nháy chữ). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Tên ngôn ngữ viết bằng chính ngôn ngữ đó, không dịch (người không đọc được ngôn ngữ hiện tại vẫn tìm ra). */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

/** Giá trị lạ (cookie bị sửa tay, ngôn ngữ đã bỏ) → ngôn ngữ mặc định. */
export function resolveLocale(value: unknown): AppLocale {
  return (LOCALES as readonly unknown[]).includes(value) ? (value as AppLocale) : DEFAULT_LOCALE;
}
