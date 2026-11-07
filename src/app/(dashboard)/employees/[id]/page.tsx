import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { EmployeePage as EmployeeProfile } from "./_components/employee-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Employees.Detail");
  return { title: t("metaTitle") };
}

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess access={{ permissions: ["employee:read"] }}>
      <EmployeeProfile id={id} />
    </RequireAccess>
  );
}
