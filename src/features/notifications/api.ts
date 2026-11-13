import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type { AppNotification, UnreadCount } from "./types";

/** Thông báo của tôi, mới nhất trước. */
export const getNotifications = (unreadOnly: boolean, params: PageParams) =>
  http.get<PageResponse<AppNotification>>("/api/notifications", {
    query: { ...toPageQuery({ page: params.page, size: params.size }), unreadOnly },
  });

export const getUnreadCount = () => http.get<UnreadCount>("/api/notifications/unread-count");

/** Đánh dấu đã đọc; bấm lại vẫn được. Không phải của mình → 404. */
export const markNotificationRead = (id: string) =>
  http.post<void>(`/api/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = () => http.post<void>("/api/notifications/read-all");
