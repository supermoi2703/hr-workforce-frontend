import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { InputPage } from "@/features/payroll/components/input-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.inputs");
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps<"/payroll/[month]/inputs">) {
  const { month } = await params;
  return (
    <RequireAccess access={{ permissions: ["payroll:read"] }}>
      <InputPage month={decodeURIComponent(month)} />
    </RequireAccess>
  );
}
