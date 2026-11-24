import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ManageKpiPage } from "@/features/kpi/components/manage-page";
import { initialKpiMonth } from "@/features/kpi/rules";
import { todayIsoDate } from "@/lib/format";

export async function generateMetadata() {
  const t = await getTranslations("Kpi.screen");
  return { title: t("manage") };
}

export default async function Page({ searchParams }: PageProps<"/kpi/manage">) {
  const { month } = await searchParams;
  const initialMonth = initialKpiMonth(month, todayIsoDate().slice(0, 7));

  return (
    <RequireAccess access={{ permissions: ["kpi:read"] }}>
      <ManageKpiPage key={initialMonth} initialMonth={initialMonth} />
    </RequireAccess>
  );
}
