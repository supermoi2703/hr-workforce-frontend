"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import {
  createAnnouncement,
  getAnnouncement,
  getAnnouncements,
  getManagedAnnouncement,
  getManagedAnnouncements,
  publishAnnouncement,
  removeAnnouncement,
  updateAnnouncement,
} from "./api";
import type { AnnouncementFilters, CreateAnnouncementInput, UpdateAnnouncementInput } from "./types";

/** Query key của domain bảng tin. Mọi key bắt đầu bằng "announcements" để invalidate cả nhóm sau khi ghi. */
export const announcementKeys = {
  all: ["announcements"] as const,
  list: (filters: AnnouncementFilters, params: PageParams) => ["announcements", "list", filters, params] as const,
  detail: (id: string) => ["announcements", "detail", id] as const,
  managed: (filters: AnnouncementFilters, params: PageParams) => ["announcements", "managed", filters, params] as const,
  managedDetail: (id: string) => ["announcements", "managed-detail", id] as const,
};

export function useAnnouncements(filters: AnnouncementFilters, params: PageParams) {
  return useQuery({
    queryKey: announcementKeys.list(filters, params),
    queryFn: () => getAnnouncements(filters, params),
    placeholderData: keepPreviousData,
  });
}

export function useAnnouncement(id: string) {
  return useQuery({ queryKey: announcementKeys.detail(id), queryFn: () => getAnnouncement(id) });
}

export function useManagedAnnouncements(filters: AnnouncementFilters, params: PageParams) {
  return useQuery({
    queryKey: announcementKeys.managed(filters, params),
    queryFn: () => getManagedAnnouncements(filters, params),
    placeholderData: keepPreviousData,
  });
}

/** `id` null = chưa mở bài nào (form tạo mới), không gọi API. */
export function useManagedAnnouncement(id: string | null) {
  return useQuery({
    queryKey: announcementKeys.managedDetail(id ?? ""),
    queryFn: () => getManagedAnnouncement(id as string),
    enabled: id !== null,
    // Mở form sửa luôn lấy version mới nhất, không dùng bản cũ trong bộ nhớ đệm.
    gcTime: 0,
  });
}

function useRefreshAfterWrite() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: announcementKeys.all });
}

/** Tải lại danh sách sau lỗi "dữ liệu cũ" (vd người khác vừa sửa, bài vừa bị gỡ). */
export function useRefreshAnnouncements() {
  return useRefreshAfterWrite();
}

export function useCreateAnnouncement() {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (body: CreateAnnouncementInput) => createAnnouncement(body), onSuccess: refresh });
}

export function useUpdateAnnouncement(id: string) {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (body: UpdateAnnouncementInput) => updateAnnouncement(id, body), onSuccess: refresh });
}

export function usePublishAnnouncement() {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (id: string) => publishAnnouncement(id), onSuccess: refresh });
}

export function useRemoveAnnouncement() {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (id: string) => removeAnnouncement(id), onSuccess: refresh });
}
