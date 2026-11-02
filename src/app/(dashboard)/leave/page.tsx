import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { LeavePage } from "@/features/timesheet/components/leave-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Leave");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền (gửi đơn: attendance:punch; duyệt: người duyệt của bước).
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:punch"] }}>
      <LeavePage />
    </RequireAccess>
  );
}
