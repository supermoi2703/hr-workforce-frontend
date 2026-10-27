import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordFlow } from "@/features/auth/components/forgot-password-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.ForgotPassword");
  return { title: t("metaTitle") };
}

/** `?email=` có trong link của email đặt lại mật khẩu → vào thẳng bước nhập mã. */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { email } = await searchParams;
  return <ForgotPasswordFlow initialEmail={typeof email === "string" ? email : undefined} />;
}
