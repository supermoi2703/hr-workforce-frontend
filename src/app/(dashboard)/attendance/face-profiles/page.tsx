import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequireAccess } from "@/components/shared/require-access";
import { FaceProfilesPage } from "@/features/attendance/components/face-profiles-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance.enroll");
  return { title: t("metaTitle") };
}

export default function Page() {
  return (
    <RequireAccess access={{ permissions: ["face:manage"] }}>
      <FaceProfilesPage />
    </RequireAccess>
  );
}
