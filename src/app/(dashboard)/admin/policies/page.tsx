import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { buttonVariants } from "@/components/ui/button";
import { PolicyListPage } from "@/features/policies/components/policy-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Policies");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra policy:read / policy:manage ở từng API.
export default async function PoliciesPage() {
  const t = await getTranslations("Payroll.performanceRates");

  return (
    <RequireAccess access={{ permissions: ["policy:read"] }}>
      <PolicyListPage
        actions={
          <RequireAccess access={{ permissions: ["payroll:config"] }} fallback={null}>
            <Link className={buttonVariants({ variant: "outline" })} href="/admin/policies/performance-rates">
              {t("title")}
            </Link>
          </RequireAccess>
        }
      />
    </RequireAccess>
  );
}
