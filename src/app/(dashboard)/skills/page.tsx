import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SkillsPage } from "@/features/skills/components/skills-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Skills");
  return { title: t("metaTitle") };
}

// Mọi người đã đăng nhập đều tự khai kỹ năng; tab hàng chờ / tìm người / danh mục tự ẩn khi thiếu quyền.
export default function SkillsRoute() {
  return <SkillsPage />;
}
