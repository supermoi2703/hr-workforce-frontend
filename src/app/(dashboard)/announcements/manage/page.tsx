import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AnnouncementManage } from "./_components/announcement-manage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Announcements.Manage");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra announcement:manage và phạm vi văn phòng ở từng API.
export default function ManageAnnouncementsPage() {
  return (
    <RequireAccess access={{ permissions: ["announcement:manage"] }}>
      <AnnouncementManage />
    </RequireAccess>
  );
}
