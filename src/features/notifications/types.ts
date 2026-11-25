/** Loại thông báo, khớp enum NotificationType ở backend (module notification, README mục 2). */
export const NOTIFICATION_TYPES = [
  "APPROVAL_PENDING",
  "APPROVAL_REASSIGNED",
  "APPROVAL_COMPLETED",
  "SKILL_DECLARED",
  "SKILL_CONFIRMED",
  "ALLOCATION_ENDED",
  "PROJECT_MANAGER_ASSIGNED",
  "PROJECT_MANAGER_REMOVED",
  "CONTRACT_EXPIRING",
  "MISSING_CHECKOUT",
  "FACE_CONSENT_WITHDRAWAL_REQUESTED",
  "PAYSLIP_PUBLISHED",
  "ANNOUNCEMENT_PUBLISHED",
  "OVERTIME_ASSIGNED",
  "OVERTIME_RESPONDED",
  "OVERTIME_CANCELLED",
  "KPI_RATING_OPENED",
  "KPI_REVIEW_READY",
  "KPI_LOCKED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Một thông báo. Câu chữ ghép ở frontend từ `type` + `params` (Notifications.types.<TYPE>). */
export interface AppNotification {
  id: string;
  /** Backend có thể thêm loại mới trước khi frontend kịp dịch → string. */
  type: NotificationType | string;
  params: Record<string, unknown>;
  /** Đường dẫn trong ứng dụng khi bấm; null = không bấm được. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}

/** Tín hiệu realtime từ backend sau khi có thông báo mới. */
export interface NotificationSignal {
  unreadCount: number;
}

/** Đích STOMP của chính người đang đăng nhập. */
export const NOTIFICATION_DESTINATION = "/user/queue/notifications";
