import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { RatingsPage } from "@/features/kpi/components/ratings-page";
import { initialKpiMonth } from "@/features/kpi/rules";
import { todayIsoDate } from "@/lib/format";

export async function generateMetadata() {
  const t = await getTranslations("Kpi.screen");
  return { title: t("ratings") };
}

export default async function Page({ searchParams }: PageProps<"/kpi/ratings">) {
  const { month } = await searchParams;
  const initialMonth = initialKpiMonth(month, todayIsoDate().slice(0, 7));

  return (
    <RequireAccess access={{ employeeProfile: true }}>
      <RatingsPage key={initialMonth} initialMonth={initialMonth} />
    </RequireAccess>
  );
}
