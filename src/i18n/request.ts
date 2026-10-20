import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { APP_TIME_ZONE } from "@/lib/format";
import { LOCALE_COOKIE, resolveLocale } from "./config";

// Ngôn ngữ lấy từ cookie, không nằm trên URL (không có /en, /vi).
export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: APP_TIME_ZONE,
  };
});
