import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { RoleListPage } from "@/features/users/components/roles/role-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RoleAdmin");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra role:read / role:manage ở từng API.
export default function RolesPage() {
  return (
    <RequireAccess access={{ permissions: ["role:read"] }}>
      <RoleListPage />
    </RequireAccess>
  );
}
