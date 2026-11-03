import type { ApprovalDetail, ApprovalType } from "./types";

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
