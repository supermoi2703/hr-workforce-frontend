import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { MissingOutPage } from "@/features/timesheet/components/missing-out-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MissingOut");
  return { title: t("title") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền và phạm vi dữ liệu.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:manage"] }}>
      <MissingOutPage />
    </RequireAccess>
  );
}
