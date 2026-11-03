import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApprovalListPage } from "@/features/approvals/components/approval-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Approvals.List");
  return { title: t("metaTitle") };
}

// Mọi người đã đăng nhập đều có inbox / đơn của mình; tab "Tất cả" tự ẩn khi thiếu approval:read-all.
export default function ApprovalsPage() {
  return <ApprovalListPage />;
}
