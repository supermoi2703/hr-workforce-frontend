// Kiểu dữ liệu khớp hợp đồng API làm thêm giờ (backend docs/de-xuat/ot-kpi-api.md, chốt 23/11/2026).
// Ngày "yyyy-MM-dd", giờ gửi lên "HH:mm", thời điểm trả về là chuỗi ISO-8601 có múi giờ.

export const OVERTIME_KINDS = ["ASSIGNED", "CLAIMED"] as const;
export type OvertimeKind = (typeof OVERTIME_KINDS)[number];

export const OVERTIME_STATUSES = ["WAIT_EMPLOYEE", "WAIT_APPROVAL", "ACTIVE", "REJECTED", "CANCELLED", "EXPIRED", "SETTLED"] as const;
export type OvertimeStatus = (typeof OVERTIME_STATUSES)[number];

/** Enum lịch có sẵn của backend. */
export const DAY_TYPES = ["WORKING_DAY", "WEEKLY_OFF", "HOLIDAY"] as const;
export type DayType = (typeof DAY_TYPES)[number];

/** Một phiếu làm thêm giờ (OvertimeRequestResponse). Không có trường tiền nào. */
export type OvertimeRequest = {
  id: string;
  kind: OvertimeKind;
  status: OvertimeStatus;
  employeeId: string;
  employeeName: string;
  /** null được: dự phòng OT ngoài dự án. */
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskKey: string | null;
  taskTitle: string | null;
  workDate: string;
  startAt: string;
  endAt: string;
  plannedMinutes: number;
  reason: string | null;
  createdById: string;
  createdByName: string;
  /** Lúc nhân viên bấm Đồng ý / Từ chối, hoặc lúc duyệt xong. */
  respondedAt: string | null;
  /** Chỉ CLAIMED: yêu cầu duyệt, mở ở /approvals/{id}. */
  approvalRequestId: string | null;
  dayType: DayType;
  /** null khi chưa tính giờ thật. */
  paidMinutesNormal: number | null;
  paidMinutesNight: number | null;
  /** Số lần chấm lẻ, giờ OT tạm bằng 0 chờ HR quyết. */
  pendingHrDecision: boolean;
  settledAt: string | null;
  createdAt: string;
  /** Tính cho người đang gọi API. Chỉ hiện nút theo các cờ này. */
  canAccept: boolean;
  canDecline: boolean;
  canCancel: boolean;
};

/** Mức đã dùng và trần của một người, tính cho tháng / năm của ngày hỏi. */
export type OvertimeUsage = {
  usedMonthMinutes: number;
  usedYearMinutes: number;
  monthCapMinutes: number;
  yearCapMinutes: number;
  /** Tối đa trong ngày: 240 ngày làm việc, 720 ngày nghỉ (theo tham số). */
  maxDayMinutes: number;
  /** Giờ kết thúc riêng của người đó trong ngày ("HH:mm"); null nếu là ngày nghỉ. */
  scheduledEnd: string | null;
  /** false: vượt trần chỉ cảnh báo, không chặn. */
  enforceCaps: boolean;
};

export type MyOvertime = { items: OvertimeRequest[]; usage: OvertimeUsage };

export type ClaimTask = { taskId: string; taskKey: string; taskTitle: string; projectId: string; projectName: string };

/** Gợi ý khai báo cho một ngày: khung giờ từ lần chấm và những task của chính người khai. */
export type ClaimDraft = {
  workDate: string;
  suggestedStart?: string | null;
  suggestedEnd?: string | null;
  /** false: đã quá hạn khai cho ngày này. */
  withinWindow: boolean;
  /** Hạn cuối còn khai được. */
  deadline: string;
  tasks: ClaimTask[];
};

export type OvertimeWindowInput = { workDate: string; startTime: string; endTime: string; reason?: string | null };
export type AssignOvertimeInput = OvertimeWindowInput & { employeeId: string; taskId: string };
export type ClaimOvertimeInput = OvertimeWindowInput & { taskId: string };

export type OvertimeListFilters = { month: string; officeId?: string; status?: OvertimeStatus };

export type OfficeOption = { id: string; code: string; name: string };
