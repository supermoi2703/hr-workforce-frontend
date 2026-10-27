import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

// Be Vietnam Pro: thiết kế riêng cho dấu tiếng Việt (dấu chồng như "ưở", "ậ" rõ ràng ở cỡ nhỏ).
// Chỉ dùng 3 độ đậm để giữ phân cấp chữ đơn giản.
const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ngôn ngữ đọc từ cookie (src/i18n/request.ts). Provider tự nhận messages của ngôn ngữ đó từ server.
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
