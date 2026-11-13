import { CATEGORY_COLORS, type CategoryColor, type CategoryRef } from "./types";

/**
 * Tên loại để hiển thị theo ngôn ngữ giao diện: tiếng Anh dùng tên tiếng Anh nếu loại có (sau khi cắt khoảng trắng), ngược
 * lại (hoặc ngôn ngữ khác) dùng tên tiếng Việt. Tên do HR nhập nên không dịch tự động.
 */
export function categoryName(category: Pick<CategoryRef, "name" | "nameEn">, locale: string): string {
  const english = category.nameEn?.trim();
  return locale === "en" && english ? english : category.name;
}

/**
 * Màu nhạt của loại bài: nền nhạt và chữ đậm cùng tông, có bản cho chế độ tối. Class viết nguyên chữ để Tailwind quét
 * được; thêm màu thì thêm vào CATEGORY_COLORS (types.ts), enum CategoryColor và CHECK ở backend.
 */
export const CATEGORY_COLOR_CLASSES: Record<CategoryColor, string> = {
  SLATE: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  BLUE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  GREEN: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  ROSE: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  VIOLET: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
};

/** Màu của ô chọn màu (chấm tròn), đậm hơn nền nhãn một chút để nhìn rõ khi nhỏ. */
export const CATEGORY_SWATCH_CLASSES: Record<CategoryColor, string> = {
  SLATE: "bg-slate-400",
  BLUE: "bg-blue-400",
  GREEN: "bg-green-400",
  AMBER: "bg-amber-400",
  ROSE: "bg-rose-400",
  VIOLET: "bg-violet-400",
};

/** Màu lạ (backend thêm màu mới mà frontend chưa cập nhật) rơi về xám thay vì mất nhãn. */
export function categoryColorClass(color: string): string {
  return CATEGORY_COLOR_CLASSES[color as CategoryColor] ?? CATEGORY_COLOR_CLASSES.SLATE;
}

export const COLOR_OPTIONS: readonly CategoryColor[] = CATEGORY_COLORS;
