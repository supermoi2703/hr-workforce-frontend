import type { DailyAttendance, Punch } from "./types";

/**
 * Gom các lần quét thành từng ngày của từng nhân viên: lần đầu là check-in, lần cuối là check-out
 * (chỉ có một lần quét thì chưa có check-out). Kết quả xếp ngày mới trước.
 */
export function groupByDay(punches: Punch[]): DailyAttendance[] {
  const groups = new Map<string, Punch[]>();
  for (const punch of punches) {
    const key = `${punch.workDate}|${punch.employee.id}`;
    const list = groups.get(key);
    if (list) list.push(punch);
    else groups.set(key, [punch]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.punchedAt.localeCompare(b.punchedAt));
      return {
        key,
        workDate: sorted[0].workDate,
        employee: sorted[0].employee,
        first: sorted[0],
        last: sorted.length > 1 ? sorted[sorted.length - 1] : null,
        punches: sorted,
      };
    })
    .sort((a, b) => b.workDate.localeCompare(a.workDate) || (a.employee.fullName ?? "").localeCompare(b.employee.fullName ?? ""));
}

/** Điểm cosine 0..1 → phần trăm để hiện "độ khớp". */
export function scorePercent(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

/** Số thứ tự ảnh hỏng trong lỗi đăng ký ("photo=2: ..."), để đánh dấu ảnh cần chụp lại. */
export function failedPhotoIndex(message: string | undefined): number | null {
  const match = message?.match(/photo=(\d+)/);
  return match ? Number(match[1]) - 1 : null;
}
