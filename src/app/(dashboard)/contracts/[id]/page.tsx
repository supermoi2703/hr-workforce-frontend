import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ContractDetailPage } from "@/features/contracts/components/contract-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contracts.Detail");
  return { title: t("metaTitle") };
}

export default async function ContractPage({ params }: PageProps<"/contracts/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess access={{ permissions: ["contract:read"] }}>
      <ContractDetailPage id={id} />
    </RequireAccess>
  );
}
