import type { Messages } from "next-intl";
import { z } from "zod";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  type AnnouncementDetail,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "./types";

type ValidationKey = keyof Messages["Announcements"]["Validation"];
/** Hàm dịch của namespace "Announcements.Validation". */
export type AnnouncementsValidationTranslator = (key: ValidationKey) => string;

/**
 * Khớp CreateAnnouncementRequest của backend. Backend vẫn kiểm tra lại (đơn vị còn dùng, quyền nhắm đối tượng).
 * `companyWide` = người đăng được chọn đối tượng; HR văn phòng không có ô chọn nên không bắt chọn văn phòng.
 */
export function announcementSchema(t: AnnouncementsValidationTranslator, companyWide: boolean) {
  return z
    .object({
      title: z.string().trim().min(1, t("required")).max(MAX_TITLE_LENGTH, t("tooLong")),
      content: z.string().trim().min(1, t("required")).max(MAX_CONTENT_LENGTH, t("tooLong")),
      category: z.enum(ANNOUNCEMENT_CATEGORIES),
      pinned: z.boolean(),
      audienceType: z.enum(ANNOUNCEMENT_AUDIENCES),
      /** "" = chưa chọn. */
      officeId: z.string(),
      departmentId: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!companyWide) return;
      if (values.audienceType === "OFFICE" && !values.officeId) {
        ctx.addIssue({ code: "custom", path: ["officeId"], message: t("required") });
      }
      if (values.audienceType === "DEPARTMENT" && !values.departmentId) {
        ctx.addIssue({ code: "custom", path: ["departmentId"], message: t("required") });
      }
    });
}

export type AnnouncementFormValues = z.infer<ReturnType<typeof announcementSchema>>;

export const EMPTY_FORM: AnnouncementFormValues = {
  title: "",
  content: "",
  category: "OTHER",
  pinned: false,
  audienceType: "OFFICE",
  officeId: "",
  departmentId: "",
};

export function toFormValues(announcement: AnnouncementDetail): AnnouncementFormValues {
  return {
    title: announcement.title,
    content: announcement.content,
    category: announcement.category,
    pinned: announcement.pinned,
    audienceType: announcement.audienceType,
    officeId: announcement.officeId ?? "",
    departmentId: announcement.departmentId ?? "",
  };
}

/**
 * Body gửi backend. HR văn phòng luôn gửi OFFICE không kèm văn phòng (backend lấy văn phòng của họ); người đăng toàn
 * quyền chỉ gửi đúng đơn vị của loại đã chọn (backend từ chối đơn vị thừa).
 */
export function toRequest(values: AnnouncementFormValues, companyWide: boolean): CreateAnnouncementInput {
  const audienceType = companyWide ? values.audienceType : "OFFICE";
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    category: values.category,
    pinned: values.pinned,
    audienceType,
    officeId: companyWide && audienceType === "OFFICE" ? values.officeId : null,
    departmentId: companyWide && audienceType === "DEPARTMENT" ? values.departmentId : null,
  };
}

export function toUpdateRequest(
  values: AnnouncementFormValues,
  companyWide: boolean,
  announcement: Pick<AnnouncementDetail, "audienceType" | "officeId" | "departmentId" | "version" | "status">,
): UpdateAnnouncementInput {
  const request = toRequest(values, companyWide);
  // Bài đã đăng khóa đối tượng nhận: gửi lại đúng đối tượng cũ, kể cả khi HR văn phòng không có ô chọn.
  if (announcement.status === "PUBLISHED") {
    return {
      ...request,
      audienceType: announcement.audienceType,
      officeId: announcement.officeId,
      departmentId: announcement.departmentId,
      version: announcement.version,
    };
  }
  return { ...request, version: announcement.version };
}
