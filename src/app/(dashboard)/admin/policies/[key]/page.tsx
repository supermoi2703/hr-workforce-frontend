import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PolicyDetailPage } from "@/features/policies/components/policy-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Policies.Detail");
  return { title: t("metaTitle") };
}

export default async function PolicyPage({ params }: PageProps<"/admin/policies/[key]">) {
  const { key } = await params;
  return (
    <RequireAccess access={{ permissions: ["policy:read"] }}>
      <PolicyDetailPage policyKey={decodeURIComponent(key)} />
    </RequireAccess>
  );
}
