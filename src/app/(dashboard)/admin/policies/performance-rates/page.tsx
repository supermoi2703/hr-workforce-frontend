import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PerformanceRatesPage } from "@/features/payroll/components/performance-rates-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.performanceRates");
  return { title: t("title") };
}

export default function Page() {
  return <PerformanceRatesPage />;
}
