import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { UserListPage } from "@/features/users/components/user-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Users");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra user:read ở từng API.
export default function UsersPage() {
  return (
    <RequireAccess access={{ permissions: ["user:read"] }}>
      <UserListPage />
    </RequireAccess>
  );
}
