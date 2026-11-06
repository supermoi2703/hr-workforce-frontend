import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ProjectDetailPage } from "@/features/projects/components/project-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Projects.Detail");
  return { title: t("metaTitle") };
}

export default async function ProjectRoute({ params }: PageProps<"/projects/[code]">) {
  const { code } = await params;
  return (
    <RequireAccess access={{ permissions: ["project:read"] }}>
      <ProjectDetailPage code={code} />
    </RequireAccess>
  );
}
