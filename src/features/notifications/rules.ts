import { NOTIFICATION_TYPES, type AppNotification, type NotificationSignal, type NotificationType } from "./types";

/** Số trên chuông: ẩn khi 0, quá 99 thì "99+". */
export function badgeLabel(count: number | undefined): string | null {
  if (!count || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function isKnownType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/**
 * Chỉ điều hướng tới đường dẫn nội bộ ("/..."), không "//host" hay "https://": link do backend tạo nhưng vẫn chặn
 * để không thành chỗ chuyển hướng ra ngoài.
 */
export function safeLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.includes("\\")) return null;
  return link;
}

/** Tham số mà câu dịch của từng loại dùng (thiếu tham số thì next-intl báo lỗi, nên luôn điền đủ). */
const PARAM_KEYS: Record<NotificationType, readonly string[]> = {
  APPROVAL_PENDING: ["approvalType", "title"],
  APPROVAL_REASSIGNED: ["approvalType", "title"],
  APPROVAL_COMPLETED: ["approvalType", "title", "status"],
  SKILL_DECLARED: ["employeeName", "skillCode", "level"],
  SKILL_CONFIRMED: ["skillCode", "confirmedLevel"],
  ALLOCATION_ENDED: ["projectCode", "lastDay"],
  PROJECT_MANAGER_ASSIGNED: ["projectCode", "effectiveFrom"],
  PROJECT_MANAGER_REMOVED: ["projectCode", "effectiveFrom"],
  CONTRACT_EXPIRING: ["contractNumber", "employeeName", "endDate"],
  MISSING_CHECKOUT: ["workDate"],
};

/** Tham số là ngày (yyyy-MM-dd) cần định dạng theo kiểu Việt Nam trước khi ghép câu. */
const DATE_KEYS = new Set(["lastDay", "effectiveFrom", "endDate", "workDate"]);

/**
 * Giá trị để ghép câu `Notifications.types.<TYPE>`: đủ mọi tham số câu cần (thiếu → "—"), ngày đã định dạng, loại đơn
 * đã dịch (`translateApprovalType`).
 */
export function messageValues(
  notification: Pick<AppNotification, "type" | "params">,
  helpers: { formatDate: (value: string) => string; translateApprovalType: (type: string) => string },
): Record<string, string> {
  if (!isKnownType(notification.type)) return {};
  const values: Record<string, string> = {};
  for (const key of PARAM_KEYS[notification.type]) {
    const raw = notification.params[key];
    if (raw === null || raw === undefined || raw === "") {
      values[key] = "—";
    } else if (key === "approvalType") {
      values[key] = helpers.translateApprovalType(String(raw));
    } else if (DATE_KEYS.has(key)) {
      values[key] = helpers.formatDate(String(raw));
    } else {
      values[key] = String(raw);
    }
  }
  return values;
}

/** Dòng phụ dưới câu chính: lý do từ chối / rút, ghi chú khi chốt kỹ năng. */
export function detailOf(notification: Pick<AppNotification, "type" | "params">): { kind: "comment" | "note"; text: string } | null {
  const pick = (key: string) => {
    const value = notification.params[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  if (notification.type === "APPROVAL_COMPLETED") {
    const comment = pick("comment");
    return comment ? { kind: "comment", text: comment } : null;
  }
  if (notification.type === "SKILL_CONFIRMED") {
    const note = pick("note");
    return note ? { kind: "note", text: note } : null;
  }
  return null;
}

/** Tín hiệu realtime hợp lệ không (dữ liệu từ mạng, kiểm trước khi dùng). */
export function isSignal(body: unknown): body is NotificationSignal {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>).unreadCount === "number"
  );
}
