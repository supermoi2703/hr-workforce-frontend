import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyPayslipPage } from "@/features/payroll/components/my-payslip-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Payroll.mine");
  return { title: t("metaTitle") };
}

// Mọi người đăng nhập đều vào được: backend chỉ trả phiếu của chính họ.
export default function Page() {
  return <MyPayslipPage />;
}
