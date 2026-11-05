import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Employees.Detail");
  return { title: t("metaTitle") };
}

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess access={{ permissions: ["employee:read"] }}>
      <EmployeeDetailPage id={id} />
    </RequireAccess>
  );
}
