"use client";

import { CalendarCheckIcon, ClipboardCheckIcon, TimerIcon, TreePalmIcon, type LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { BackendStatusCard } from "@/features/system/components/backend-status-card";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";

// Chỗ dành sẵn cho thẻ trên trang chủ. Khi làm xong, thay thẻ tương ứng bằng component thật
// của feature mình (vd. <AttendanceCard /> trong features/attendance/components).
const UPCOMING_WIDGETS: { title: string; description: string; icon: LucideIcon }[] = [
  { title: "Chấm công hôm nay", description: "Check-in / check-out", icon: TimerIcon },
  { title: "Phép còn lại", description: "Số ngày phép năm còn lại", icon: TreePalmIcon },
  { title: "Việc cần duyệt", description: "Yêu cầu đang chờ bạn duyệt", icon: ClipboardCheckIcon },
  { title: "Dự án của tôi", description: "Dự án và % phân bổ hiện tại", icon: CalendarCheckIcon },
];

export default function HomePage() {
  const { user } = useCurrentUser();

  return (
    <>
      <PageHeader title={`Xin chào, ${user?.displayName ?? ""}`} description={`Hôm nay ${formatDate(new Date())}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {UPCOMING_WIDGETS.map((widget) => (
          <Card key={widget.title} className="border-dashed bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <widget.icon className="size-4 text-muted-foreground" /> {widget.title}
              </CardTitle>
              <CardDescription>{widget.description} · Sắp có</CardDescription>
            </CardHeader>
          </Card>
        ))}
        <BackendStatusCard />
      </div>
    </>
  );
}
