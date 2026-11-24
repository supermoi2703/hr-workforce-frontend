import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { IncidentsPage } from "@/features/timesheet/components/incidents-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Timesheet.incidents");
  return { title: t("title") };
}

export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:manage"] }}>
      <IncidentsPage />
    </RequireAccess>
  );
}
