"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Lưu ngôn ngữ người dùng chọn. Ghi cookie trong Server Action thì Next tự render lại trang hiện tại. */
export async function setUserLocale(locale: string): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, resolveLocale(locale), {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
