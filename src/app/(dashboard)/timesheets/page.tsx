import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { TimesheetPage } from "@/features/timesheet/components/timesheet-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Timesheet");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền và phạm vi dữ liệu.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:punch"] }}>
      <TimesheetPage />
    </RequireAccess>
  );
}
