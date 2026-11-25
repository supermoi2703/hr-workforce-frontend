import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { MyFaceConsentPage } from "@/features/attendance/components/my-face-consent-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FaceConsent");
  return { title: t("title") };
}

export default function Page() {
  return (
    <RequireAccess access={{ employeeProfile: true }}>
      <MyFaceConsentPage />
    </RequireAccess>
  );
}
