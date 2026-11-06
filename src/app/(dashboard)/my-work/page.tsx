import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyWorkPage } from "@/features/projects/components/my-work-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects");
  return { title: t("myWorkTitle") };
}

export default function MyWorkRoute() {
  return <MyWorkPage />;
}
