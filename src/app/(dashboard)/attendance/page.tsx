import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AttendancePage } from "@/features/attendance/components/attendance-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra attendance:read và phạm vi dữ liệu.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:read"] }}>
      <AttendancePage />
    </RequireAccess>
  );
}
