"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import { useAuthActions, useCurrentUser } from "@/lib/auth/auth-provider";
import { getMyActivity, getMySessions, login } from "./api";
import { safeNextPath } from "./next-path";

/** Query key của trang tài khoản. Bắt đầu bằng "account" để invalidate cả nhóm khi cần. */
export const accountKeys = {
  all: ["account"] as const,
  sessions: ["account", "sessions"] as const,
  activity: (params: PageParams) => ["account", "activity", params] as const,
};

/** Thiết bị đang đăng nhập của chính mình. */
export function useMySessions() {
  return useQuery({ queryKey: accountKeys.sessions, queryFn: getMySessions });
}

/** Hoạt động bảo mật của chính mình (phân trang phía server). */
export function useMyActivity(params: PageParams) {
  return useQuery({
    queryKey: accountKeys.activity(params),
    queryFn: () => getMyActivity(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Các trang đăng nhập / quên mật khẩu / kích hoạt: đã có phiên thì rời trang. Gồm: vừa đăng nhập xong, mở trang
 * khi đang đăng nhập (F5 lấy lại phiên), tab khác vừa đăng nhập, chế độ mock (luôn coi là đã đăng nhập).
 */
export function useRedirectIfAuthenticated(next?: string) {
  const { status } = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace(safeNextPath(next));
  }, [status, next, router]);
}

/** Backend chặn gửi lại mã trong 60 giây (app.otp.resend-cooldown). */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Đếm ngược cho nút "Gửi lại mã". `remaining` = số giây còn lại (0 = gửi được). */
export function useCooldown() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) setEndsAt(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds: number = RESEND_COOLDOWN_SECONDS) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, start };
}

/**
 * Đăng nhập luôn bằng mật khẩu vừa đặt (sau khi đặt lại mật khẩu / kích hoạt). Thành công thì useRedirectIfAuthenticated
 * tự chuyển trang; không được (bị giới hạn, mất mạng...) thì về /login với email điền sẵn và thông báo `reason`.
 */
export function useSignInWithPassword(reason: string) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  return useCallback(
    async (email: string, password: string) => {
      try {
        signIn(await login({ email, password }));
      } catch {
        router.replace(`/login?${new URLSearchParams({ email, reason })}`);
      }
    },
    [reason, router, signIn],
  );
}
