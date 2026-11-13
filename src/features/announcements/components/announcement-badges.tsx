"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { categoryColorClass } from "../categories";
import { useCategoryName } from "../hooks";
import type { AnnouncementAudience, AnnouncementStatus, CategoryRef } from "../types";

const STATUS_VARIANT: Record<AnnouncementStatus, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  REMOVED: "outline",
};

/** Loại bài: tên và một màu nhạt do HR chọn, không icon. Cùng kiểu ở mọi màn hình. */
export function AnnouncementCategoryBadge({ category }: { category: Pick<CategoryRef, "name" | "nameEn" | "color"> }) {
  const nameOf = useCategoryName();
  return (
    <Badge variant="secondary" className={categoryColorClass(category.color)}>
      {nameOf(category)}
    </Badge>
  );
}

/** Trạng thái bài (chỉ người quản lý thấy nháp và bài đã gỡ). */
export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  const t = useTranslations("Announcements.statuses");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}

/** Đối tượng nhận: "Toàn công ty", "Văn phòng: Hà Nội", "Phòng ban: PTPM". */
export function AnnouncementAudienceLabel({
  audienceType,
  audienceName,
}: {
  audienceType: AnnouncementAudience;
  audienceName: string | null;
}) {
  const t = useTranslations("Announcements.audiences");
  if (audienceType === "COMPANY" || !audienceName) return <>{t(audienceType)}</>;
  return (
    <>
      {t(audienceType)}: {audienceName}
    </>
  );
}
