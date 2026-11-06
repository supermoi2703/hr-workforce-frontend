import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { ContractListPage } from "@/features/contracts/components/contract-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contracts");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra contract:read và phạm vi dữ liệu ở từng API.
export default function ContractsPage() {
  return (
    <RequireAccess access={{ permissions: ["contract:read"] }}>
      <ContractListPage />
    </RequireAccess>
  );
}
