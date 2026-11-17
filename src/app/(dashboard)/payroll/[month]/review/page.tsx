import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ReviewPage } from "@/features/payroll/components/review-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.review");
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps<"/payroll/[month]/review">) {
  const { month } = await params;
  return (
    <RequireAccess access={{ permissions: ["payroll:read"] }}>
      <ReviewPage month={decodeURIComponent(month)} />
    </RequireAccess>
  );
}
