"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadingState } from "@/components/shared/states";
import { readPendingNext } from "@/features/auth/next-path";
import { useCurrentUser } from "@/lib/auth/auth-provider";

/**
 * Backend chuyển về đây sau khi đăng nhập Google thành công (cookie refresh_token đã được đặt).
 * Không tự gọi API: AuthProvider lấy phiên từ cookie ngay khi mở trang, ở đây chỉ chờ kết quả rồi chuyển trang.
 */
export default function AuthCallbackPage() {
  const t = useTranslations("Auth.Callback");
  const { status } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(readPendingNext());
    // Không lấy được phiên (cookie thiếu / hết hạn): coi như đăng nhập Google thất bại.
    else if (status === "unauthenticated") router.replace("/login?error=GOOGLE_LOGIN_FAILED");
  }, [status, router]);

  return <LoadingState className="min-h-svh" label={t("signingIn")} />;
}
