import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PolicyQaPage } from "@/features/policy-qa/components/policy-qa-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PolicyQa");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền ai:policy-qa ở từng API.
export default function PolicyQaRoute() {
  return (
    <RequireAccess access={{ permissions: ["ai:policy-qa"] }}>
      <PolicyQaPage />
    </RequireAccess>
  );
}
