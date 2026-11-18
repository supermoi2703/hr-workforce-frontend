import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_TONE_TEXT, type DomainTone } from "./icon-tile";

/** Nền nhạt của chip theo nhóm chức năng (`neutral` = xám nhạt). */
const TINT_BG: Record<DomainTone, string> = {
  time: "bg-info/10",
  leave: "bg-success/10",
  approval: "bg-warning/10",
  project: "bg-primary/10",
  people: "bg-chart-5/10",
  money: "bg-chart-2/10",
  neutral: "bg-muted",
};

type TintChipProps = {
  icon: LucideIcon;
  /** Màu nền nhạt và màu icon. */
  tone: DomainTone;
  /** Đổi riêng màu icon, vd nền xám nhưng icon màu nhấn của trang. */
  iconClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Chip nền nhạt, chữ màu thường, icon màu nhấn: vai trò (trang Tổ chức), trạng thái kỹ năng... Dùng thay badge màu đặc khi
 * danh sách cần giữ một tông với trang (docs/huong-dan-khung-frontend.md mục 7).
 */
export function TintChip({ icon: Icon, tone, iconClassName, className, children }: TintChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap text-foreground",
        TINT_BG[tone],
        className,
      )}
    >
      <Icon className={cn("size-3", DOMAIN_TONE_TEXT[tone], iconClassName)} aria-hidden />
      {children}
    </span>
  );
}
