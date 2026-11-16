import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ComplaintPage } from "@/features/payroll/components/complaint-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.complaints");
  return { title: t("metaTitle") };
}

export default async function Page({ searchParams }: PageProps<"/payroll/complaints">) {
  const { month } = await searchParams;
  return (
    <RequireAccess access={{ permissions: ["payroll:manage"] }}>
      <ComplaintPage initialMonth={typeof month === "string" ? month : undefined} />
    </RequireAccess>
  );
}
