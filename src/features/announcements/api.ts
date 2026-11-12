import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  AnnouncementDetail,
  AnnouncementFilters,
  AnnouncementItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./types";

const enc = encodeURIComponent;

/** Bài đã đăng thuộc đối tượng nhận của mình (announcement:read): ghim trước, mới nhất trước. Thứ tự do server quyết. */
export const getAnnouncements = (filters: AnnouncementFilters, params: PageParams) =>
  http.get<PageResponse<AnnouncementItem>>("/api/announcements", {
    query: { ...toPageQuery({ ...params, sort: undefined }), category: filters.category, q: filters.q },
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
