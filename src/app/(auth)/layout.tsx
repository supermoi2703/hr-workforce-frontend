import { AuthShowcase } from "@/features/auth/components/auth-showcase";

/**
 * Khung các trang đăng nhập (không sidebar): form bên trái, hình minh họa bên phải (chỉ màn ≥ lg).
 * Hai cột cùng canh giữa theo chiều dọc. Route group (auth) nằm ngoài (dashboard) nên không bị AppShell
 * chuyển hướng về /login.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh bg-card lg:grid-cols-2">
      <main className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <div className="hidden p-4 lg:flex">
        <div className="flex flex-1 items-center justify-center rounded-xl bg-muted p-10">
          <AuthShowcase />
        </div>
      </div>
    </div>
  );
}
