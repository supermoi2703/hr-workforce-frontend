import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountTabs } from "@/features/auth/components/account/account-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("metaTitle") };
}

/** Tài khoản của chính người đang đăng nhập. Tab đang mở nằm trên URL (?tab=), AccountTabs tự đọc. */
export default function AccountPage() {
  return <AccountTabs />;
}
