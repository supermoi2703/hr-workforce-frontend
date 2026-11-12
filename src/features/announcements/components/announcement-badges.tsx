"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AnnouncementAudience, AnnouncementCategory, AnnouncementStatus } from "../types";

const CATEGORY_VARIANT: Record<AnnouncementCategory, "info" | "success" | "warning" | "secondary"> = {
  POLICY: "info",
  EVENT: "success",
  HEALTH: "warning",
  OTHER: "secondary",
};

const STATUS_VARIANT: Record<AnnouncementStatus, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  REMOVED: "outline",
};

/** Loại bài, cùng màu ở mọi màn hình. */
export function AnnouncementCategoryBadge({ category }: { category: AnnouncementCategory }) {
  const t = useTranslations("Announcements.categories");
  return <Badge variant={CATEGORY_VARIANT[category]}>{t(category)}</Badge>;
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
