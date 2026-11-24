import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ReviewsPage } from "@/features/kpi/components/reviews-page";
import { initialKpiMonth } from "@/features/kpi/rules";
import { todayIsoDate } from "@/lib/format";

export async function generateMetadata() {
  const t = await getTranslations("Kpi.screen");
  return { title: t("reviews") };
}

export default async function Page({ searchParams }: PageProps<"/kpi/reviews">) {
  const { month } = await searchParams;
  const initialMonth = initialKpiMonth(month, todayIsoDate().slice(0, 7));

  return (
    <RequireAccess access={{ employeeProfile: true }}>
      <ReviewsPage key={initialMonth} initialMonth={initialMonth} />
    </RequireAccess>
  );
}
