import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { KioskGuestPage } from "@/features/attendance/components/kiosk-guest-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance.kiosk");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default function Page() {
  return <KioskGuestPage />;
}
