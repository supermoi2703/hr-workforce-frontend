import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { MailPage } from "@/features/payroll/components/mail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.mail");
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps<"/payroll/[month]/mail">) {
  const { month } = await params;
  return (
    <RequireAccess access={{ permissions: ["payroll:read"] }}>
      <MailPage month={decodeURIComponent(month)} />
    </RequireAccess>
  );
}
