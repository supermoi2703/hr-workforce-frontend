import type { Metadata } from "next";
import { ProjectDetailPage } from "@/features/projects/components/project-detail-page";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function ProjectDetailRoute({ params }: Props) {
  const { code } = await params;
  return <ProjectDetailPage code={code.toUpperCase()} />;
}
