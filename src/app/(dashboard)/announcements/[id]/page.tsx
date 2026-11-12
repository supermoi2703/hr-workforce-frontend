import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AnnouncementDetailPage } from "@/features/announcements/components/announcement-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Announcements.Detail");
  return { title: t("metaTitle") };
}

export default async function AnnouncementPage({ params }: PageProps<"/announcements/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess access={{ permissions: ["announcement:read"] }}>
      <AnnouncementDetailPage id={id} />
    </RequireAccess>
  );
}
