import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { IconTile, type DomainTone } from "@/components/shared/icon-tile";
import { cn } from "@/lib/utils";

export type Metric = {
  label: string;
  icon: LucideIcon;
  tone: DomainTone;
  href: string;
  /** Giá trị chính (vd. "08:12", "9 ngày"). Bỏ trống khi module chưa có dữ liệu. */
  value?: ReactNode;
  /** Dòng phụ dưới giá trị (vd. "Đúng giờ", "Hết hạn 31/12"). */
  detail?: ReactNode;
};

/**
 * Hàng chỉ số trên trang chủ: một khối duy nhất chia cột bằng đường kẻ (không tách thành nhiều thẻ).
 * Mỗi ô bấm được, dẫn tới trang chi tiết của chỉ số đó.
 */
export function MetricStrip({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <ul
      className={cn("grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4", className)}
    >
      {metrics.map((metric) => (
        <li
          key={metric.href}
          // Đường kẻ giữa các ô: 2 cột thì kẻ dọc giữa + ngang giữa 2 hàng; 4 cột chỉ kẻ dọc.
          className="border-b odd:border-r nth-last-[-n+2]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
        >
          <Link
            href={metric.href}
            className="flex h-full flex-col items-start gap-2 p-3 sm:flex-row sm:gap-3 sm:p-4 outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <IconTile icon={metric.icon} tone={metric.tone} />
            <span className="min-w-0 space-y-1">
              <span className="block text-sm text-muted-foreground">{metric.label}</span>
              {metric.value !== undefined ? (
                <span className="block text-xl leading-7 font-semibold tabular-nums">{metric.value}</span>
              ) : (
                <span className="block text-xl leading-7 font-semibold text-muted-foreground/60" aria-label="Chưa có dữ liệu">
                  —
                </span>
              )}
              <span className="block text-xs text-muted-foreground">{metric.detail ?? "Chưa có dữ liệu"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
