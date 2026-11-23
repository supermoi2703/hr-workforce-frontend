import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ProjectPage } from "./_components/project-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects.Detail");
  return { title: t("metaTitle") };
}

export default async function ProjectRoute({ params }: PageProps<"/projects/[code]">) {
  const { code } = await params;
  return (
    <RequireAccess access={{ permissions: ["project:read"] }}>
      <ProjectPage code={code} />
    </RequireAccess>
  );
}
