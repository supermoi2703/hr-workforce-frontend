import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyContracts } from "@/features/contracts/components/my-contracts";
import { MyProfilePage } from "@/features/employees/components/my-profile-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("metaTitle") };
}

/** Hồ sơ nhân viên của chính người đang đăng nhập (mọi tài khoản có gắn hồ sơ, không cần employee:read). */
export default function ProfilePage() {
  return <MyProfilePage contracts={<MyContracts />} />;
}
