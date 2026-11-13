import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotificationListPage } from "@/features/notifications/components/notification-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Notifications");
  return { title: t("title") };
}

/** Thông báo của chính người đang đăng nhập (ai cũng vào được). */
export default function NotificationsPage() {
  return <NotificationListPage />;
}
