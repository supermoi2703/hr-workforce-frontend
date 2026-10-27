import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ActivateAccountForm } from "@/features/auth/components/activate-account-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.Activate");
  return { title: t("metaTitle") };
}

/** `?email=` có trong link của email mời kích hoạt tài khoản. */
export default async function ActivatePage({ searchParams }: PageProps<"/activate">) {
  const { email } = await searchParams;
  return <ActivateAccountForm initialEmail={typeof email === "string" ? email : undefined} />;
}
