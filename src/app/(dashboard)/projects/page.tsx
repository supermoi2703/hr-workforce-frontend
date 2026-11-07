import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ProjectListPage } from "@/features/projects/components/project-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects.List");
  return { title: t("metaTitle") };
}

export default function ProjectsRoute() {
  return (
    <RequireAccess access={{ permissions: ["project:read"] }}>
      <ProjectListPage />
    </RequireAccess>
  );
}
