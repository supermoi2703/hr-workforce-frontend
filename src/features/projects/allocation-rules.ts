import type { Project, ProjectMember } from "./types";
import type { AllocationRequest, AllocationSegment, Candidate } from "./work-types";

// Luật thuần của màn phân bổ (3.4). Khớp backend: README module project mục 8. Ngày dạng "yyyy-MM-dd" so sánh được
// bằng chuỗi.

/** % đề xuất được: bội của 5, từ 5 đến 100. */
export const ALLOCATION_PERCENTS: readonly number[] = Array.from({ length: 20 }, (_, i) => 100 - i * 5);

export type Period = { from: string; to: string | null };

export type PeriodProblem = "fromBeforeToday" | "beforeProjectStart" | "endRequired" | "afterProjectEnd" | "endBeforeStart";

type ProjectDates = Pick<Project, "startDate" | "endDate">;

/** Khoảng mặc định: từ hôm nay, hoặc ngày bắt đầu dự án nếu dự án chưa chạy; tới ngày kết thúc dự án (nếu có). */
export function defaultPeriod(project: ProjectDates, today: string): Period {
  return { from: project.startDate > today ? project.startDate : today, to: project.endDate };
}

/** Lỗi đầu tiên của khoảng ngày; backend báo chung một mã ALLOCATION_DATES_INVALID nên giao diện chặn trước. */
export function periodProblem(project: ProjectDates, today: string, period: Period): PeriodProblem | null {
  const { from, to } = period;
  if (from < today) return "fromBeforeToday";
  if (from < project.startDate) return "beforeProjectStart";
  if (to !== null && to < from) return "endBeforeStart";
  if (project.endDate !== null && to === null) return "endRequired";
  if (project.endDate !== null && to !== null && to > project.endDate) return "afterProjectEnd";
  return null;
}

/** Còn đủ chỗ cho mức đã chọn; chưa biết (chưa hỏi khoảng ngày) thì coi như đủ, backend vẫn chặn. */
export function hasRoomFor(candidate: Candidate, percent: number): boolean {
  return candidate.freePercent === null || candidate.freePercent >= percent;
}

/**
 * Người mà nút "Chọn tất cả" tick: chưa ở dự án và còn đủ chỗ. Người đang ở dự án vẫn chọn tay được (đề xuất mới đặt lại
 * % của họ trong khoảng đó), nhưng không nằm trong "tất cả" để không đổi nhầm.
 */
export function selectableIds(candidates: Candidate[], percent: number): string[] {
  return candidates
    .filter((candidate) => !candidate.alreadyInProject && hasRoomFor(candidate, percent))
    .map((candidate) => candidate.person.id);
}

/**
 * Danh sách được gửi: chỉ người đã được tick (mặc định không tick ai, vì một team có thể rất đông); người không đủ chỗ
 * luôn bị bỏ.
 */
export function pickedIds(candidates: Candidate[], percent: number, choices: ReadonlyMap<string, boolean>): string[] {
  return candidates
    .filter((candidate) => hasRoomFor(candidate, percent))
    .filter((candidate) => choices.get(candidate.person.id) === true)
    .map((candidate) => candidate.person.id);
}

/** Đề xuất đang chờ, mới nhất trước. */
export function pendingRequests(requests: AllocationRequest[]): AllocationRequest[] {
  return requests
    .filter((request) => request.status === "PENDING")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Bên tạo giữ mọi ghế duyệt (vd PM kiêm trưởng phòng): cả lô đã vào dự án ngay. */
export function allApplied(requests: AllocationRequest[]): boolean {
  return requests.length > 0 && requests.every((request) => request.status === "APPROVED");
}

/** Dòng thành viên chưa kết thúc: hiện nút đổi % và kết thúc sớm. */
export function isRunningMember(member: ProjectMember, today: string): boolean {
  return member.role === "MEMBER" && (member.toDate === null || member.toDate >= today);
}

// ===== Lịch phân bổ của một người (trang /allocations)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Số thứ tự ngày (UTC) của "yyyy-MM-dd"; null nếu không phải ngày hợp lệ. */
function dayNumber(iso: string): number | null {
  if (!ISO_DATE.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  const back = new Date(time);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) return null;
  return time / DAY_MS;
}

/** Số ngày từ `from` đến `to`, tính cả hai đầu. */
function inclusiveDays(from: string, to: string): number {
  const start = dayNumber(from);
  const end = dayNumber(to);
  return start === null || end === null ? 0 : Math.max(0, end - start + 1);
}

export type ScheduleRange = { from?: string; to?: string };

/**
 * Khoảng ngày đọc từ URL: bỏ giá trị không phải ngày, bỏ `to` nếu trước `from`. Thiếu thì để trống cho backend tự chọn
 * (từ hôm nay, 180 ngày).
 */
export function scheduleRange(from: string | null, to: string | null): ScheduleRange {
  const validFrom = from !== null && dayNumber(from) !== null ? from : undefined;
  const validTo = to !== null && dayNumber(to) !== null ? to : undefined;
  if (validFrom && validTo && validTo < validFrom) return { from: validFrom };
  return { from: validFrom, to: validTo };
}

/**
 * Vị trí trên trục [rangeFrom, rangeTo] (tính theo ngày, cả hai đầu). `startsBefore` / `endsAfter`: thanh còn tiếp ra ngoài
 * khoảng đang xem (hoặc không có ngày kết thúc), để vẽ mũi tên.
 */
export type TimelineSpan = { start: string; end: string; leftPercent: number; widthPercent: number; startsBefore: boolean; endsAfter: boolean };

/** Vị trí của khoảng [from, to] trên trục; `to` null = không thời hạn. Null nếu không có ngày nào nằm trong trục. */
export function timelineSpan(from: string, to: string | null, rangeFrom: string, rangeTo: string): TimelineSpan | null {
  const total = inclusiveDays(rangeFrom, rangeTo);
  const origin = dayNumber(rangeFrom);
  if (total === 0 || origin === null) return null;
  const start = from > rangeFrom ? from : rangeFrom;
  const end = to === null || to > rangeTo ? rangeTo : to;
  const days = inclusiveDays(start, end);
  const startDay = dayNumber(start);
  if (days === 0 || startDay === null) return null;
  return {
    start,
    end,
    leftPercent: ((startDay - origin) / total) * 100,
    widthPercent: (days / total) * 100,
    startsBefore: from < rangeFrom,
    endsAfter: to === null || to > rangeTo,
  };
}

/** Vị trí (%) của một ngày trên trục, ở giữa ô ngày đó; null nếu ngoài khoảng. Dùng cho vạch "Hôm nay". */
export function dayOffsetPercent(day: string, rangeFrom: string, rangeTo: string): number | null {
  const span = timelineSpan(day, day, rangeFrom, rangeTo);
  return span === null ? null : span.leftPercent + span.widthPercent / 2;
}

export type MonthTick = { date: string; month: number; year: number; leftPercent: number };

/** Mốc đầu mỗi tháng nằm trong (rangeFrom, rangeTo]; ngày đầu khoảng không tính vì trục đã ghi ngày đó. */
export function monthTicks(rangeFrom: string, rangeTo: string): MonthTick[] {
  const start = dayNumber(rangeFrom);
  if (start === null || dayNumber(rangeTo) === null || rangeTo < rangeFrom) return [];
  const ticks: MonthTick[] = [];
  let [year, month] = rangeFrom.split("-").map(Number);
  for (;;) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    if (date > rangeTo) return ticks;
    const span = timelineSpan(date, date, rangeFrom, rangeTo);
    if (span) ticks.push({ date, month, year, leftPercent: span.leftPercent });
  }
}

/** `pendingPercent`: riêng phần đang giữ cho đề xuất chờ duyệt (backend trả `heldPercent` là tổng, đã gồm phần đã duyệt). */
export type SegmentBar = AllocationSegment & TimelineSpan & { pendingPercent: number };

/**
 * Đoạn của thanh tổng, rộng theo số ngày trong [from, to]. Đoạn không có ngày kết thúc kéo tới `to`; phần nằm ngoài khoảng
 * bị cắt, đoạn không còn ngày nào bị bỏ.
 */
export function segmentBars(segments: AllocationSegment[], from: string, to: string): SegmentBar[] {
  return segments.flatMap((segment) => {
    const span = timelineSpan(segment.from, segment.to, from, to);
    if (span === null) return [];
    return [{ ...segment, ...span, pendingPercent: Math.max(0, segment.heldPercent - segment.approvedPercent) }];
  });
}

/** % còn trống của đoạn chứa ngày `day`; null nếu ngày đó nằm ngoài lịch. */
export function freePercentOn(segments: AllocationSegment[], day: string): number | null {
  const segment = segments.find((s) => s.from <= day && (s.to === null || day <= s.to));
  return segment ? segment.freePercent : null;
}
