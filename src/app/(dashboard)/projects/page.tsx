import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProjectsPage } from "@/features/projects/components/projects-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects");
  return { title: t("title") };
}

export default function ProjectsRoute() {
  return <ProjectsPage />;
}
