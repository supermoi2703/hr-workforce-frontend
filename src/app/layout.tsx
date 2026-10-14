import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "HRM Workforce",
    template: "%s | HRM Workforce",
  },
  description: "Hệ thống quản lý và điều phối nhân lực",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
