import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

// Inter có bộ ký tự tiếng Việt (subset "vietnamese").
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HRM Workforce",
    template: "%s · HRM Workforce",
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
