import type en from "./messages/en.json";
import type { AppLocale } from "./src/i18n/config";

// Kiểu cho next-intl: key dịch sai hoặc thiếu trong en.json thì typecheck báo lỗi.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
