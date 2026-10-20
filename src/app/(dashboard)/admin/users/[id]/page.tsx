import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { UserDetailPage } from "@/features/users/components/user-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Users.Detail");
  return { title: t("metaTitle") };
}

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess access={{ permissions: ["user:read"] }}>
      <UserDetailPage id={id} />
    </RequireAccess>
  );
}
