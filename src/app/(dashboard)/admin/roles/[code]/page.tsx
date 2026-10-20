import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { RoleDetailPage } from "@/features/users/components/roles/role-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RoleAdmin.Detail");
  return { title: t("metaTitle") };
}

export default async function RolePage({ params }: PageProps<"/admin/roles/[code]">) {
  const { code } = await params;
  return (
    <RequireAccess access={{ permissions: ["role:read"] }}>
      <RoleDetailPage code={decodeURIComponent(code)} />
    </RequireAccess>
  );
}
