import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { MyOvertimePage } from "@/features/overtime/components/my-overtime-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Overtime");
  return { title: t("metaTitle") };
}

// Như trang nghỉ phép: chỉ người chấm công (có hồ sơ nhân viên). Backend vẫn tự kiểm tra và chỉ trả phiếu của người gọi.
export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["attendance:punch"] }}>
      <MyOvertimePage />
    </RequireAccess>
  );
}
