import { addDays } from "../allocation-rules";
import type { LoadDay, LoadWeek, WorkloadZone } from "../work-types";

// Ô tải của biểu đồ và bảng nhiệt (workload bước 5). Mốc khớp backend (README module project mục 7.2): ≤ 100% xanh,
// ≤ 125% vàng, trên nữa đỏ; một ngày quá 12 giờ đỏ.

const YELLOW_MAX = 1.25;
const DAY_MAX_MINUTES = 12 * 60;

export type LoadCell = {
  key: string;
  start: string;
  end: string;
  capacityMinutes: number;
  loadMinutes: number;
  overtimeMinutes: number;
  zone: WorkloadZone;
  /** Dòng phụ dưới số giờ, vd "nghỉ" hoặc "%". */
  note?: string;
};

export function zoneOf(load: number, capacity: number, dayOver = false): WorkloadZone {
  if (dayOver || (capacity === 0 && load > 0)) return "RED";
  if (load <= capacity) return "GREEN";
  return load <= capacity * YELLOW_MAX ? "YELLOW" : "RED";
}

/** Ô theo tuần (mức Tháng / Quý): vùng lấy từ backend; ghi % hoặc chữ "nghỉ" khi tuần không có năng lực lẫn việc. */
export function weekCells(weeks: LoadWeek[], fullLeave: string): LoadCell[] {
  return weeks.map((week) => ({
    key: week.weekStart,
    start: week.weekStart,
    end: addDays(week.weekStart, 6) ?? week.weekStart,
    capacityMinutes: week.capacityMinutes,
    loadMinutes: week.loadMinutes,
    overtimeMinutes: week.overtimeMinutes ?? 0,
    zone: week.zone,
    note: week.capacityMinutes === 0 && week.loadMinutes === 0 ? fullLeave : week.percent === null ? undefined : `${week.percent}%`,
  }));
}

/** Ô theo ngày (mức Tuần): bỏ ngày không có năng lực và không có việc (cuối tuần, lễ); nghỉ nửa ngày ghi "½". */
export function dayCells(days: LoadDay[]): LoadCell[] {
  return days
    .filter((day) => day.capacityMinutes > 0 || day.loadMinutes > 0)
    .map((day) => ({
      key: day.date,
      start: day.date,
      end: day.date,
      capacityMinutes: day.capacityMinutes,
      loadMinutes: day.loadMinutes,
      overtimeMinutes: day.overtimeMinutes,
      zone: zoneOf(day.loadMinutes, day.capacityMinutes, day.loadMinutes > DAY_MAX_MINUTES),
      note: day.leave === "HALF" ? "½" : undefined,
    }));
}

/** Bậc màu của ô bảng nhiệt cả nhóm: đậm dần theo %; 0 = trống, null = nghỉ cả tuần. */
export type HeatLevel = "leave" | "empty" | "light" | "medium" | "full" | "over" | "overload";

export function heatLevel(loadMinutes: number, capacityMinutes: number, fullLeave: boolean): HeatLevel {
  if (fullLeave) return "leave";
  if (loadMinutes === 0) return "empty";
  if (capacityMinutes === 0) return "overload";
  const ratio = loadMinutes / capacityMinutes;
  if (ratio <= 0.5) return "light";
  if (ratio <= 0.85) return "medium";
  if (ratio <= 1) return "full";
  return ratio <= YELLOW_MAX ? "over" : "overload";
}
