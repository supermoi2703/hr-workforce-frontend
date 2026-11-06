import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkTeamsPage } from "@/features/projects/components/work-teams-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects");
  return { title: t("teamsTitle") };
}

export default function WorkTeamsRoute() {
  return <WorkTeamsPage />;
}
