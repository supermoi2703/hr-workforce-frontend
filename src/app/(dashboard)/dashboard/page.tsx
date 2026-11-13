import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

// Mở cho mọi người đăng nhập: khối nào hiện do backend quyết định (/api/dashboard/blocks).
export default function DashboardRoute() {
  return <DashboardPage />;
}
