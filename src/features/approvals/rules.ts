import type { ApprovalDetail, ApprovalSummary, ApprovalType } from "./types";

export type ApprovalActions = {
  /** Tôi là người duyệt của bước hiện tại và chưa quyết định. */
  canDecide: boolean;
  /** Tôi là người gửi và yêu cầu còn đang chờ. */
  canWithdraw: boolean;
};

/**
 * Tôi được làm gì với yêu cầu này, theo đúng luật của backend (backend không trả cờ). Chỉ để ẩn/hiện nút:
 * backend vẫn kiểm tra lại (NOT_CURRENT_APPROVER, FORBIDDEN).
 */
export function getApprovalActions(detail: ApprovalDetail, myUserId: string): ApprovalActions {
  const { request } = detail;
  const pending = request.status === "PENDING";
  const currentStep = detail.steps.find((step) => step.stepNo === request.currentStepNo);
  const myTurn =
    !!currentStep &&
    currentStep.status === "IN_PROGRESS" &&
    currentStep.approvers.some((approver) => approver.userId === myUserId && approver.decision === "PENDING");
  return {
    canDecide: pending && myTurn,
    canWithdraw: pending && request.requesterUserId === myUserId,
  };
}

/** Module gốc đánh dấu đơn gấp bằng tiền tố "[Gấp]" trong tiêu đề (vd xin nghỉ đột xuất): tách ra để hiện badge. */
const URGENT_PREFIX = /^\[Gấp\]\s*/;

export function parseTitle(title: string): { urgent: boolean; text: string } {
  return URGENT_PREFIX.test(title) ? { urgent: true, text: title.replace(URGENT_PREFIX, "") } : { urgent: false, text: title };
}

/** Trang của module gốc để xem bản ghi (chưa có trang chi tiết theo id nên trỏ về trang danh sách). Null = chưa có trang. */
const SOURCE_PAGES: Partial<Record<ApprovalType, string>> = {
  LEAVE: "/leave",
  LEAVE_CANCEL: "/leave",
  WFH: "/leave",
  WFH_CANCEL: "/leave",
  SHIFT_CHANGE: "/timesheets",
};

export function sourceLink(type: string): string | null {
  return SOURCE_PAGES[type as ApprovalType] ?? null;
}

/**
 * Cách gọi một người trên màn hình: chính mình → "Bạn"; không có id → hệ thống (vd đẩy lên cấp trên);
 * có tên → tên; backend chưa trả tên → không rõ ("—").
 */
export type PersonLabel = { kind: "me" } | { kind: "system" } | { kind: "name"; name: string } | { kind: "unknown" };

export function personLabel(userId: string | null, name: string | null | undefined, myUserId: string): PersonLabel {
  if (!userId) return { kind: "system" };
  if (userId === myUserId) return { kind: "me" };
  return name ? { kind: "name", name } : { kind: "unknown" };
}

/** Mảng id trong metadata của dòng thời gian; giá trị lạ (không phải mảng chuỗi) → []. */
export function idList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * user id → tên, gom từ người tạo, mọi người duyệt và mọi người thực hiện trên dòng thời gian. Mốc REASSIGNED / ESCALATED
 * chỉ có user id; người cũ vẫn nằm trong bước (NOT_REQUIRED) và người mới được thêm vào, nên tên của họ đều có ở đây.
 */
export function buildNameIndex(detail: ApprovalDetail): Map<string, string> {
  const names = new Map<string, string>();
  const add = (userId: string | null, name: string | null | undefined) => {
    if (userId && name && !names.has(userId)) names.set(userId, name);
  };
  add(detail.request.requesterUserId, detail.request.requesterName);
  for (const step of detail.steps) for (const approver of step.approvers) add(approver.userId, approver.displayName);
  for (const entry of detail.timeline) add(entry.actorUserId, entry.actorName);
  return names;
}

/** Khóa "bước:userId" của những người duyệt đã bị giao lại cho người khác (để không hiện "Không cần"). */
export function reassignedAway(detail: ApprovalDetail): Set<string> {
  const keys = new Set<string>();
  for (const entry of detail.timeline) {
    if (entry.action !== "REASSIGNED" || entry.stepNo === null) continue;
    for (const userId of idList(entry.metadata?.fromUserIds)) keys.add(`${entry.stepNo}:${userId}`);
  }
  return keys;
}

/**
 * Người được đề xuất khi đơn về NGƯỜI KHÁC người tạo (điều chuyển, phân bổ); đơn của chính người tạo → null.
 * Backend chỉ trả subjectName trong trường hợp này; chưa có tên thì vẫn báo là đơn về người khác.
 */
export function subjectOf(summary: ApprovalSummary): { name: string | null } | null {
  const subject = summary.subjectEmployeeId;
  if (!subject || subject === summary.requesterEmployeeId) return null;
  return { name: summary.subjectName ?? null };
}
