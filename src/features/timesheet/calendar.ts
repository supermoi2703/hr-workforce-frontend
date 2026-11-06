import type { LeavePart, LeaveRequest, RemoteWorkReason, RemoteWorkRequest, TimesheetDay, TimesheetStatus } from "./types";

// Ngày dạng "yyyy-MM-dd" (LocalDate của backend). Tính bằng UTC để không lệch múi giờ của máy người dùng.

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Thứ trong tuần: 0 = thứ Hai … 6 = Chủ nhật. */
export function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** "2026-11" → ngày đầu / cuối tháng. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Lưới lịch tháng bắt đầu từ thứ Hai: mỗi hàng 7 ô, ô ngoài tháng là null. */
export function monthGrid(month: string): (string | null)[][] {
  const { from, to } = monthRange(month);
  const cells: (string | null)[] = Array.from({ length: weekdayIndex(from) }, () => null);
  for (let day = from; day <= to; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "08:30:00" → "08:30". */
export function hhmm(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "—";
}

/** Giờ kết thúc khi biết giờ bắt đầu: + 9 tiếng (8 giờ làm + 1 giờ nghỉ trưa). */
export function endOfDay(start: string): string {
  const [h, m] = start.split(":").map(Number);
  return `${String(h + 9).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type Tone = "success" | "warning" | "destructive" | "info" | "muted" | "outline";

/** Màu của trạng thái ngày: đúng giờ xanh, muộn / thiếu vàng, vắng đỏ, nghỉ có đơn xanh dương. */
export function statusTone(status: TimesheetStatus): Tone {
  switch (status) {
    case "WORK":
      return "success";
    case "LATE":
    case "EARLY":
    case "LATE_EARLY":
    case "MISSING_OUT":
      return "warning";
    case "ABSENT":
      return "destructive";
    case "LEAVE_PAID":
    case "LEAVE_UNPAID":
    case "HOLIDAY":
    case "REMOTE":
      return "info";
    case "IN_PROGRESS":
      return "outline";
    default:
      return "muted";
  }
}

/** Đơn còn giữ ngày (đang chờ hoặc đã duyệt, chưa hủy) phủ ngày day. */
export function requestsOn(requests: LeaveRequest[], day: string): LeaveRequest[] {
  return requests.filter(
    (r) => (r.status === "PENDING" || r.status === "APPROVED") && r.startDate <= day && day <= r.endDate,
  );
}

/** Đơn WFH còn giữ ngày (đang chờ hoặc đã duyệt, chưa hủy) của ngày day. */
export function remoteRequestsOn(requests: RemoteWorkRequest[], day: string): RemoteWorkRequest[] {
  return requests.filter((r) => (r.status === "PENDING" || r.status === "APPROVED") && r.workDate === day);
}

export const REMOTE_REASONS: RemoteWorkReason[] = ["HEALTH", "FAMILY", "PERSONAL_TRAVEL", "DISASTER", "OFFICE_INCIDENT", "WORK_REQUIRED"];

/** Lý do chủ động có giới hạn số ngày; lý do khách quan thì không (remote-work.md mục 3, 4). */
export function isPersonalReason(reason: RemoteWorkReason): boolean {
  return reason === "HEALTH" || reason === "FAMILY" || reason === "PERSONAL_TRAVEL";
}

/** Các buổi còn trống trong ngày (bỏ buổi đã có đơn nghỉ hoặc đơn WFH). */
export function freeParts(requests: LeaveRequest[], day: string, remote: RemoteWorkRequest[] = []): LeavePart[] {
  const taken = [...requestsOn(requests, day), ...remoteRequestsOn(remote, day)];
  const morningTaken = taken.some((r) => r.part !== "AFTERNOON");
  const afternoonTaken = taken.some((r) => r.part !== "MORNING");
  const parts: LeavePart[] = [];
  if (!morningTaken && !afternoonTaken) parts.push("FULL_DAY");
  if (!morningTaken) parts.push("MORNING");
  if (!afternoonTaken) parts.push("AFTERNOON");
  return parts;
}

/** Có nút xin nghỉ cho ngày này không: ngày làm việc còn buổi trống. Ngày đã qua chỉ nghỉ ốm gửi được (backend kiểm tra). */
export function canRequestLeave(day: TimesheetDay | undefined, requests: LeaveRequest[], remote: RemoteWorkRequest[] = []): boolean {
  return !!day && day.dayType === "WORKING_DAY" && freeParts(requests, day.workDate, remote).length > 0;
}

/** Có nút xin làm từ xa không: ngày làm việc từ hôm nay trở đi còn buổi trống. */
export function canRequestRemote(day: TimesheetDay | undefined, today: string, requests: LeaveRequest[], remote: RemoteWorkRequest[]): boolean {
  return !!day && day.workDate >= today && canRequestLeave(day, requests, remote);
}
