import {
  DASHBOARD_TABS,
  RANGE_WEEKS,
  type DashboardBlock,
  type DashboardFilters,
  type DashboardTab,
  type RangeWeeks,
} from "./types";

export const DEFAULT_WEEKS: RangeWeeks = 8;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: string | null): string | undefined {
  return value && UUID.test(value) ? value : undefined;
}

/** Đọc bộ lọc từ URL; giá trị lạ bị bỏ qua (về mặc định). */
export function filtersFromSearchParams(params: URLSearchParams): DashboardFilters {
  const weeks = Number(params.get("weeks"));
  const tab = params.get("tab");
  return {
    tab: (DASHBOARD_TABS as readonly string[]).includes(tab ?? "") ? (tab as DashboardTab) : undefined,
    officeId: uuid(params.get("officeId")),
    departmentId: uuid(params.get("departmentId")),
    weeks: (RANGE_WEEKS as readonly number[]).includes(weeks) ? (weeks as RangeWeeks) : DEFAULT_WEEKS,
  };
}

/** Ghi bộ lọc lên URL; giá trị mặc định không ghi để URL gọn. */
export function filtersToSearchParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab) params.set("tab", filters.tab);
  if (filters.officeId) params.set("officeId", filters.officeId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.weeks !== DEFAULT_WEEKS) params.set("weeks", String(filters.weeks));
  return params;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Khoảng ngày của khối Nguồn lực: từ thứ Hai của tuần chứa `today` (yyyy-MM-dd), đủ `weeks` tuần. */
export function resourceRange(today: string, weeks: RangeWeeks): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(monday);
  end.setDate(monday.getDate() + weeks * 7 - 1);
  return { from: toIso(monday), to: toIso(end) };
}

/** Bậc màu của một ô heatmap: 0..4 theo % kế hoạch, "over" khi vượt trần, null khi tuần không có ngày làm việc. */
export function heatLevel(percent: number | null, limit: number): 0 | 1 | 2 | 3 | 4 | "over" | null {
  if (percent === null) return null;
  if (percent > limit) return "over";
  if (percent <= 0) return 0;
  if (percent <= 50) return 1;
  if (percent <= 80) return 2;
  if (percent < limit) return 3;
  return 4;
}

/** Phần của thanh tính phí: tính phí, không tính phí, còn trống. Tổng luôn 100 (phần vượt 100 thì không còn trống). */
export function billableSplit(plannedPercent: number, billablePercent: number) {
  const billable = Math.max(0, Math.min(billablePercent, 100));
  const nonBillable = Math.max(0, Math.min(plannedPercent, 100) - billable);
  return { billable, nonBillable, free: Math.max(0, 100 - billable - nonBillable) };
}

/** Thứ Hai → Chủ nhật của tuần bắt đầu `weekStart`. */
export function weekDays(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => toIso(new Date(y, m - 1, d + i)));
}

/**
 * Tab được xem theo các khối backend trả về. Người có khối quản lý (Nguồn lực, Nhân sự, Đội) có thêm tab Tổng quan ở đầu;
 * tab Của tôi luôn ở cuối.
 */
export function availableTabs(blocks: DashboardBlock[]): DashboardTab[] {
  const tabs: DashboardTab[] = [];
  if (blocks.includes("RESOURCES")) tabs.push("resources");
  if (blocks.includes("HR")) tabs.push("hr");
  if (blocks.includes("TEAM")) tabs.push("team");
  return tabs.length ? ["overview", ...tabs, "me"] : ["me"];
}

/** Tab đang mở: tab trên URL nếu được xem, không thì tab đầu tiên. */
export function resolveTab(requested: DashboardTab | undefined, tabs: DashboardTab[]): DashboardTab {
  return requested && tabs.includes(requested) ? requested : tabs[0];
}

export type Change = { value: number; direction: "up" | "down" | "flat" };

/** Chênh lệch `to - from` kèm hướng; không đủ số liệu thì null. */
export function change(from: number | null | undefined, to: number | null | undefined): Change | null {
  if (from === null || from === undefined || to === null || to === undefined) return null;
  const value = to - from;
  return { value, direction: value > 0 ? "up" : value < 0 ? "down" : "flat" };
}

/** Phần tử cuối và kề cuối của một chuỗi (tháng này / tháng trước). */
export function lastTwo<T>(series: T[]): { previous: T | null; current: T | null } {
  return { previous: series.at(-2) ?? null, current: series.at(-1) ?? null };
}

/** Màu chuỗi theo thứ tự đã kiểm mù màu (skill dataviz): xanh, cam, teal, tím, hồng. */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-5)", "var(--chart-4)"] as const;
export const OTHER_COLOR = "var(--muted-foreground)";

export type DonutPart = { key: string; label: string; value: number; color: string };

/** Gắn màu theo vị trí trong danh sách gốc (đủ nhóm, kể cả nhóm 0) để màu đi theo nhóm, không theo dữ liệu. */
export function withSeriesColors(parts: Omit<DonutPart, "color">[]): DonutPart[] {
  return parts.map((part, index) => ({ ...part, color: SERIES_COLORS[index % SERIES_COLORS.length] }));
}

/** Bỏ phần bằng 0; quá `max` phần thì gộp phần nhỏ thành một phần "Khác" (key `other`, màu xám). */
export function foldParts(parts: DonutPart[], max: number, otherLabel: string): DonutPart[] {
  const nonZero = parts.filter((part) => part.value > 0);
  if (nonZero.length <= max) return nonZero;
  const kept = [...nonZero].sort((a, b) => b.value - a.value).slice(0, max - 1);
  const keptKeys = new Set(kept.map((part) => part.key));
  const rest = nonZero.filter((part) => !keptKeys.has(part.key)).reduce((sum, part) => sum + part.value, 0);
  // Giữ thứ tự gốc cho các phần còn lại.
  return [
    ...nonZero.filter((part) => keptKeys.has(part.key)),
    { key: "other", label: otherLabel, value: rest, color: OTHER_COLOR },
  ];
}
