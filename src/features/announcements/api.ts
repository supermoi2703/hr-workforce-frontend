import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  AnnouncementDetail,
  AnnouncementFilters,
  AnnouncementItem,
  Category,
  CreateAnnouncementInput,
  CreateCategoryInput,
  UpdateAnnouncementInput,
  UpdateCategoryInput,
} from "./types";

const enc = encodeURIComponent;

/** Bài đã đăng thuộc đối tượng nhận của mình (announcement:read): ghim trước, mới nhất trước. Thứ tự do server quyết. */
export const getAnnouncements = (filters: AnnouncementFilters, params: PageParams) =>
  http.get<PageResponse<AnnouncementItem>>("/api/announcements", {
    query: { ...toPageQuery({ ...params, sort: undefined }), categoryId: filters.categoryId, q: filters.q },
  });

/** Ngoài đối tượng nhận, nháp hoặc đã gỡ → 404. */
export const getAnnouncement = (id: string) => http.get<AnnouncementDetail>(`/api/announcements/${enc(id)}`);

/** Mọi trạng thái trong phạm vi quản lý (announcement:manage): HR chỉ văn phòng mình, HR_COMPANY / ADMIN tất cả. */
export const getManagedAnnouncements = (filters: AnnouncementFilters, params: PageParams) =>
  http.get<PageResponse<AnnouncementItem>>("/api/announcements/manage", {
    query: { ...toPageQuery({ ...params, sort: undefined }), status: filters.status, q: filters.q },
  });

/** Cả nháp và bài đã gỡ, kèm version để sửa. */
export const getManagedAnnouncement = (id: string) =>
  http.get<AnnouncementDetail>(`/api/announcements/manage/${enc(id)}`);

/** Tạo nháp. Đăng là một bước riêng. */
export const createAnnouncement = (body: CreateAnnouncementInput) =>
  http.post<AnnouncementDetail>("/api/announcements", body);

export const updateAnnouncement = (id: string, body: UpdateAnnouncementInput) =>
  http.put<AnnouncementDetail>(`/api/announcements/${enc(id)}`, body);

export const publishAnnouncement = (id: string) =>
  http.post<AnnouncementDetail>(`/api/announcements/${enc(id)}/publish`);

export const removeAnnouncement = (id: string) =>
  http.post<AnnouncementDetail>(`/api/announcements/${enc(id)}/remove`);

// ===== Loại bài =====

/** Loại đang dùng, theo thứ tự hiển thị: bộ lọc và form chọn loại (announcement:read). */
export const getCategories = () => http.get<Category[]>("/api/announcement-categories");

/** Cả loại ngừng dùng: trang quản lý loại (announcement:manage). */
export const getAllCategories = () => http.get<Category[]>("/api/announcement-categories/all");

/** Chỉ HR toàn công ty và Admin; HR văn phòng nhận 403 ANNOUNCEMENT_CATEGORY_FORBIDDEN. */
export const createCategory = (body: CreateCategoryInput) => http.post<Category>("/api/announcement-categories", body);

export const updateCategory = (id: string, body: UpdateCategoryInput) =>
  http.put<Category>(`/api/announcement-categories/${enc(id)}`, body);

/** Ngừng dùng: bài cũ giữ loại, bài mới không chọn được. */
export const deactivateCategory = (id: string) =>
  http.post<Category>(`/api/announcement-categories/${enc(id)}/deactivate`);

export const activateCategory = (id: string) => http.post<Category>(`/api/announcement-categories/${enc(id)}/activate`);
