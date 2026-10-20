"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { LoadingState } from "../states";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

/** Khung trang sau khi đăng nhập: sidebar + header + nội dung. */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Shell");
  const { status } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Trang (auth)/login thuộc phần đăng nhập thật (Cường).
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return <LoadingState className="min-h-svh" label={t("checkingSession")} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
