import type { Project, ProjectMember } from "./types";
import type { AllocationRequest, Candidate } from "./work-types";

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
 * Người được tick sẵn: chưa ở dự án và còn đủ chỗ. Người đang ở dự án vẫn chọn được (đề xuất mới đặt lại % của họ
 * trong khoảng đó), nhưng không tick sẵn để không đổi nhầm.
 */
export function pickedByDefault(candidate: Candidate, percent: number): boolean {
  return !candidate.alreadyInProject && hasRoomFor(candidate, percent);
}

/** Danh sách được gửi: theo lựa chọn của người dùng nếu có, không thì theo mặc định; người không đủ chỗ luôn bị bỏ. */
export function pickedIds(candidates: Candidate[], percent: number, choices: ReadonlyMap<string, boolean>): string[] {
  return candidates
    .filter((candidate) => hasRoomFor(candidate, percent))
    .filter((candidate) => choices.get(candidate.person.id) ?? pickedByDefault(candidate, percent))
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
