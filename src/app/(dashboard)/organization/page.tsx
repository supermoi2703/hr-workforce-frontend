import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrganizationPage } from "@/features/organization/components/organization-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Organization");
  return { title: t("metaTitle") };
}

// Mọi người đã đăng nhập đều xem được cây tổ chức (06 C1); backend chỉ trả cột danh bạ.
export default function OrganizationRoute() {
  return <OrganizationPage />;
}
