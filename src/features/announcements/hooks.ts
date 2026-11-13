"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import {
  activateCategory,
  createAnnouncement,
  createCategory,
  deactivateCategory,
  getAllCategories,
  getAnnouncement,
  getAnnouncementBoard,
  getAnnouncements,
  getCategories,
  getManagedAnnouncement,
  getManagedAnnouncements,
  publishAnnouncement,
  removeAnnouncement,
  updateAnnouncement,
  updateCategory,
} from "./api";
import type {
  AnnouncementFilters,
  CreateAnnouncementInput,
  CreateCategoryInput,
  UpdateAnnouncementInput,
  UpdateCategoryInput,
} from "./types";

/** Query key của domain bảng tin. Mọi key bắt đầu bằng "announcements" để invalidate cả nhóm sau khi ghi. */
export const announcementKeys = {
  all: ["announcements"] as const,
  list: (filters: AnnouncementFilters, params: PageParams) => ["announcements", "list", filters, params] as const,
  board: ["announcements", "board"] as const,
  detail: (id: string) => ["announcements", "detail", id] as const,
  managed: (filters: AnnouncementFilters, params: PageParams) => ["announcements", "managed", filters, params] as const,
  managedDetail: (id: string) => ["announcements", "managed-detail", id] as const,
  categories: ["announcements", "categories"] as const,
  allCategories: ["announcements", "categories", "all"] as const,
};

/**
 * Link ảnh bìa sống 10 phút ở backend: dữ liệu đọc coi là cũ sau 8 phút để link được làm mới khi quay lại trang, và
 * không để ảnh hỏng khi mở trang quá lâu.
 */
const READ_STALE_MS = 8 * 60 * 1000;

export function useAnnouncements(filters: AnnouncementFilters, params: PageParams) {
  return useQuery({
    queryKey: announcementKeys.list(filters, params),
    queryFn: () => getAnnouncements(filters, params),
    placeholderData: keepPreviousData,
    staleTime: READ_STALE_MS,
    refetchInterval: READ_STALE_MS,
  });
}

/** Trang chủ bảng tin; trang chi tiết dùng lại chính dữ liệu này cho cột "Tin mới nhất" và "Cùng loại". */
export function useAnnouncementBoard() {
  return useQuery({
    queryKey: announcementKeys.board,
    queryFn: () => getAnnouncementBoard(),
    staleTime: READ_STALE_MS,
    refetchInterval: READ_STALE_MS,
  });
}

export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: () => getAnnouncement(id),
    staleTime: READ_STALE_MS,
    refetchInterval: READ_STALE_MS,
  });
}

export function useManagedAnnouncements(filters: AnnouncementFilters, params: PageParams) {
  return useQuery({
    queryKey: announcementKeys.managed(filters, params),
    queryFn: () => getManagedAnnouncements(filters, params),
    placeholderData: keepPreviousData,
    staleTime: READ_STALE_MS,
    refetchInterval: READ_STALE_MS,
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

/** Loại đang dùng, cho bộ lọc và form chọn loại. */
export function useCategories() {
  return useQuery({ queryKey: announcementKeys.categories, queryFn: getCategories });
}

/** Cả loại ngừng dùng; chỉ gọi khi mở trang quản lý loại. */
export function useAllCategories(enabled: boolean) {
  return useQuery({ queryKey: announcementKeys.allCategories, queryFn: getAllCategories, enabled });
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

// Đổi loại ảnh hưởng cả danh sách bài (tên, màu nhãn): làm mới cả nhóm.
export function useCreateCategory() {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (body: CreateCategoryInput) => createCategory(body), onSuccess: refresh });
}

export function useUpdateCategory(id: string) {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (body: UpdateCategoryInput) => updateCategory(id, body), onSuccess: refresh });
}

export function useSetCategoryActive() {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? activateCategory(id) : deactivateCategory(id),
    onSuccess: refresh,
  });
}
