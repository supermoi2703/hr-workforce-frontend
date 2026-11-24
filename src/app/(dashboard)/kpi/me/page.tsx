import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { MyKpiPage } from "@/features/kpi/components/my-kpi-page";
import { initialKpiMonth } from "@/features/kpi/rules";
import { todayIsoDate } from "@/lib/format";

export async function generateMetadata() {
  const t = await getTranslations("Kpi.screen");
  return { title: t("mine") };
}

export default async function Page({ searchParams }: PageProps<"/kpi/me">) {
  const { month } = await searchParams;
  const initialMonth = initialKpiMonth(month, todayIsoDate().slice(0, 7));

  return (
    <RequireAccess access={{ employeeProfile: true }}>
      <MyKpiPage key={initialMonth} initialMonth={initialMonth} />
    </RequireAccess>
  );
}
