import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AnnouncementListPage } from "@/features/announcements/components/announcement-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Announcements.Board");
  return { title: t("allPosts") };
}

export default function AllAnnouncementsPage() {
  return (
    <RequireAccess access={{ permissions: ["announcement:read"] }}>
      <AnnouncementListPage />
    </RequireAccess>
  );
}
