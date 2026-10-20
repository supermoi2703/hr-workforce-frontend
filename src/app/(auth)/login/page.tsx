import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.Login");
  return { title: t("metaTitle") };
}

/** `?next=` và `?error=` đọc ở server rồi truyền xuống form, khỏi cần useSearchParams + Suspense. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      googleError={typeof error === "string" ? error : undefined}
    />
  );
}
