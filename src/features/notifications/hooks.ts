"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import { useRealtimeStatus, useRealtimeSubscription } from "@/lib/realtime/realtime-provider";
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from "./api";
import { isSignal } from "./rules";
import { NOTIFICATION_DESTINATION } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  list: (unreadOnly: boolean, params: PageParams) => ["notifications", "list", unreadOnly, params] as const,
};

/** Đang có kênh realtime thì chỉ hỏi lại để dự phòng (5 phút); mất kênh thì hỏi lại 30 giây. */
const POLL_WHEN_LIVE_MS = 5 * 60_000;
const POLL_WHEN_OFFLINE_MS = 30_000;

/**
 * Số chưa đọc trên chuông. Nghe tín hiệu realtime (`{unreadCount}`) để cập nhật ngay và làm mới danh sách; hỏi lại theo
 * chu kỳ (chỉ khi tab đang mở) phòng khi rớt kết nối. Gọi ở nhiều chỗ vẫn chỉ có một subscription STOMP (provider gộp).
 */
export function useUnreadCount() {
  const queryClient = useQueryClient();
  const realtime = useRealtimeStatus();

  useRealtimeSubscription(NOTIFICATION_DESTINATION, (body) => {
    if (isSignal(body)) queryClient.setQueryData(notificationKeys.unreadCount, body.unreadCount);
    void queryClient.invalidateQueries({ queryKey: [...notificationKeys.all, "list"] });
  });

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => (await getUnreadCount()).count,
    refetchInterval: realtime === "connected" ? POLL_WHEN_LIVE_MS : POLL_WHEN_OFFLINE_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

/** Danh sách thông báo (popover: trang đầu; trang /notifications: có phân trang). */
export function useNotifications(unreadOnly: boolean, params: PageParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly, params),
    queryFn: () => getNotifications(unreadOnly, params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    enabled: options.enabled ?? true,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.setQueryData(notificationKeys.unreadCount, 0),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
