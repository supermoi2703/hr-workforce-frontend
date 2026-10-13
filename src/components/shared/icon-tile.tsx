import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Màu cố định cho từng nhóm chức năng, dùng thống nhất cho icon menu, ô icon, badge, biểu đồ của nhóm đó:
 * - time: chấm công, bảng công, lịch văn phòng (xanh trời)
 * - leave: nghỉ phép, WFH (xanh lá)
 * - approval: việc cần duyệt, yêu cầu (hổ phách)
 * - project: tổng quan, dự án, phân bổ, kỹ năng (xanh thương hiệu)
 * - people: nhân viên, tổ chức, hợp đồng (tím)
 * - money: lương, phiếu lương (teal)
 * - neutral: quản trị, công cụ phát triển (xám)
 */
export type DomainTone = "time" | "leave" | "approval" | "project" | "people" | "money" | "neutral";

/** Chỉ màu chữ/icon, vd. icon trên sidebar. */
export const DOMAIN_TONE_TEXT: Record<DomainTone, string> = {
  time: "text-info",
  leave: "text-success",
  approval: "text-warning",
  project: "text-primary",
  people: "text-chart-5",
  money: "text-chart-2",
  neutral: "text-muted-foreground",
};

/** Nền nhạt + màu icon, cho ô icon. */
export const DOMAIN_TONE_CLASSES: Record<DomainTone, string> = {
  time: "bg-info/10 text-info",
  leave: "bg-success/10 text-success",
  approval: "bg-warning/10 text-warning",
  project: "bg-primary/10 text-primary",
  people: "bg-chart-5/10 text-chart-5",
  money: "bg-chart-2/10 text-chart-2",
  neutral: "bg-muted text-muted-foreground",
};

type IconTileProps = {
  icon: LucideIcon;
  tone: DomainTone;
  className?: string;
};

/** Ô icon vuông mang màu của nhóm chức năng. */
export function IconTile({ icon: Icon, tone, className }: IconTileProps) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", DOMAIN_TONE_CLASSES[tone], className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
