import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.Login");
  return { title: t("metaTitle") };
}

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Tham số URL đọc ở server rồi truyền xuống form, khỏi cần useSearchParams + Suspense. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, reason, email } = await searchParams;
  return (
    <LoginForm next={single(next)} googleError={single(error)} reason={single(reason)} initialEmail={single(email)} />
  );
}
