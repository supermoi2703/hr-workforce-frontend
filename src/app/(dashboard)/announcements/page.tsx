import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AnnouncementListPage } from "@/features/announcements/components/announcement-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Announcements");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra announcement:read và đối tượng nhận ở từng API.
export default function AnnouncementsPage() {
  return (
    <RequireAccess access={{ permissions: ["announcement:read"] }}>
      <AnnouncementListPage />
    </RequireAccess>
  );
}
