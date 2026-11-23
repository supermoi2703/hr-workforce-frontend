import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { OvertimeManagePage } from "@/features/overtime/components/overtime-manage-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Overtime.manage");
  return { title: t("metaTitle") };
}

export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["overtime:read"] }}>
      <OvertimeManagePage />
    </RequireAccess>
  );
}
