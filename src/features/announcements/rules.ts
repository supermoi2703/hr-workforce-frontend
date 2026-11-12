import type { AnnouncementAudience, AnnouncementStatus, UnitOption } from "./types";

/** Role được nhắm cả công ty và phòng ban (backend: roles.data_scope = ALL). HR văn phòng chỉ nhắm văn phòng mình. */
const COMPANY_WIDE_ROLES = ["ADMIN", "HR_COMPANY"] as const;

/** Chỉ để ẩn / hiện ô chọn: backend vẫn là nơi kiểm tra quyền (403 ANNOUNCEMENT_AUDIENCE_FORBIDDEN). */
export function canTargetCompanyWide(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some((role) => (COMPANY_WIDE_ROLES as readonly string[]).includes(role));
}

/** Đối tượng nhận người đăng chọn được. HR văn phòng không có ô chọn: bài luôn gửi tới văn phòng của họ. */
export function audienceOptions(companyWide: boolean): AnnouncementAudience[] {
  return companyWide ? ["COMPANY", "OFFICE", "DEPARTMENT"] : ["OFFICE"];
}

/** Gỡ rồi thì không sửa, không đăng lại. */
export const canEdit = (status: AnnouncementStatus) => status !== "REMOVED";

export const canPublish = (status: AnnouncementStatus) => status === "DRAFT";

export const canRemove = (status: AnnouncementStatus) => status !== "REMOVED";

/** Người đã thấy bài không được mất bài vì đổi đối tượng nhận (backend ANNOUNCEMENT_AUDIENCE_LOCKED). */
export const isAudienceLocked = (status: AnnouncementStatus) => status === "PUBLISHED";

/** Bài đã đăng mới có trang đọc; nháp và bài đã gỡ chỉ mở ở form sửa. */
export const isReadable = (status: AnnouncementStatus) => status === "PUBLISHED";

/** Lựa chọn cho ô chọn đơn vị: đơn vị đang dùng, cộng đơn vị hiện tại nếu nó đã ngừng dùng (để ô không bị trống). */
export function unitChoices(units: readonly UnitOption[] | undefined, currentId?: string | null): UnitOption[] {
  return (units ?? []).filter((unit) => unit.active || unit.id === currentId);
}
