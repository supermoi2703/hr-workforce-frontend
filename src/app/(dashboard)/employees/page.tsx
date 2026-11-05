import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { EmployeeListPage } from "@/features/employees/components/employee-list-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Employees");
  return { title: t("metaTitle") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra employee:read và phạm vi dữ liệu ở từng API.
export default function EmployeesPage() {
  return (
    <RequireAccess access={{ permissions: ["employee:read"] }}>
      <EmployeeListPage />
    </RequireAccess>
  );
}
