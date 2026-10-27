import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { KioskScreen } from "@/features/attendance/components/kiosk-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance.kiosk");
  return { title: t("metaTitle") };
}

// Bản demo: máy chấm công chạy bằng tài khoản HR đã đăng nhập (attendance:kiosk); token thiết bị làm sau.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:kiosk"] }}>
      <KioskScreen />
    </RequireAccess>
  );
}
