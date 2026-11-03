import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PolicyListPage } from "@/features/policies/components/policy-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Policies");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra policy:read / policy:manage ở từng API.
export default function PoliciesPage() {
  return (
    <RequireAccess access={{ permissions: ["policy:read"] }}>
      <PolicyListPage />
    </RequireAccess>
  );
}
