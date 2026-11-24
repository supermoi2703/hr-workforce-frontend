import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { PeriodsPage } from "@/features/timesheet/components/periods-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TimesheetPeriods");
  return { title: t("title") };
}

// Ẩn trên giao diện thôi: backend vẫn tự kiểm tra quyền (chốt kỳ cần phạm vi toàn công ty).
export default async function Page({ searchParams }: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;
  const initialMonth = typeof month === "string" && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month) ? month : undefined;
  return (
    <RequireAccess access={{ permissions: ["attendance:manage"] }}>
      <PeriodsPage key={initialMonth} initialMonth={initialMonth} />
    </RequireAccess>
  );
}
