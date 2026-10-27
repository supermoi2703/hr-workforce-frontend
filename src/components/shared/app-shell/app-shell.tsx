"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthActions, useCurrentUser, type SessionEndReason } from "@/lib/auth/auth-provider";
import { LoadingState } from "../states";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

/** Lý do gắn lên /login?reason= để trang đăng nhập giải thích vì sao phải đăng nhập lại. */
const LOGIN_REASONS: Partial<Record<SessionEndReason, string>> = {
  expired: "session_expired",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
};

function loginUrl(pathname: string, endReason: SessionEndReason | null): string {
  // Tự bấm đăng xuất (ở tab này hay tab khác): về trang đăng nhập trống, không quay lại trang cũ.
  if (endReason === "signed-out") return "/login";
  const params = new URLSearchParams({ next: pathname });
  const reason = endReason && LOGIN_REASONS[endReason];
  if (reason) params.set("reason", reason);
  return `/login?${params}`;
}

/** Khung trang sau khi đăng nhập: sidebar + header + nội dung. */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Shell");
  const { status } = useCurrentUser();
  const { endReason } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Giữ cả query string (vd bộ lọc nhật ký ?action=...) để đăng nhập lại quay về đúng chỗ.
    if (status === "unauthenticated") router.replace(loginUrl(pathname + window.location.search, endReason));
  }, [status, endReason, router, pathname]);

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
