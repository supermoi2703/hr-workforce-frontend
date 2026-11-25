import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { KioskManagementPage } from "@/features/attendance/components/kiosk-management-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KioskManagement");
  return { title: t("title") };
}

export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["kiosk:manage"] }}>
      <KioskManagementPage />
    </RequireAccess>
  );
}
