import { AppShell } from "@/components/shared/app-shell/app-shell";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <AppShell headerActions={<NotificationBell />}>{children}</AppShell>;
}
