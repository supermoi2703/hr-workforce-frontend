import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { AuditLogPage } from "@/features/audit/components/audit-log-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AuditLog");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra audit:read.
export default function AuditLogsPage() {
  return (
    <RequireAccess access={{ permissions: ["audit:read"] }}>
      <AuditLogPage />
    </RequireAccess>
  );
}
