import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PeriodListPage } from "@/features/payroll/components/period-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["payroll:read"] }}>
      <PeriodListPage />
    </RequireAccess>
  );
}
