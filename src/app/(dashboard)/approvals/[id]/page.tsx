import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApprovalDetailPage } from "@/features/approvals/components/approval-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Approvals.Detail");
  return { title: t("metaTitle") };
}

// Ai được xem do backend quyết định (người gửi, người duyệt, người theo dõi, read-all trong phạm vi): còn lại nhận 404.
export default async function ApprovalPage({ params }: PageProps<"/approvals/[id]">) {
  const { id } = await params;
  return <ApprovalDetailPage id={decodeURIComponent(id)} />;
}
