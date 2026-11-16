import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PeriodDetailPage } from "@/features/payroll/components/period-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll");
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps<"/payroll/[month]">) {
  const { month } = await params;
  return (
    <RequireAccess access={{ permissions: ["payroll:read"] }}>
      <PeriodDetailPage month={decodeURIComponent(month)} />
    </RequireAccess>
  );
}
