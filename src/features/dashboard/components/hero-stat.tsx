"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Change } from "../rules";

export type HeroTone = "project" | "people" | "time" | "approval" | "leave";

/** Chữ của nhãn so sánh nền trắng: màu đậm cùng tông của thẻ (đọc được ở cả hai theme). */
const TONE_INK: Record<HeroTone, string> = {
  project: "text-[var(--hero-project-to)]",
  people: "text-[var(--hero-people-to)]",
  time: "text-[var(--hero-time-to)]",
  approval: "text-[var(--hero-approval-to)]",
  leave: "text-[var(--hero-leave-to)]",
};

const TONE_CLASS: Record<HeroTone, string> = {
  project: "bg-hero-project",
  people: "bg-hero-people",
  time: "bg-hero-time",
  approval: "bg-hero-approval",
  leave: "bg-hero-leave",
};

type HeroStatProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: HeroTone;
  /** Dòng phụ dưới số (vd. "4 tuần tới"). */
  detail?: ReactNode;
  /** Nhãn so sánh: mũi tên + số + chữ nói so với cái gì; không chỉ dựa vào màu. */
  change?: Change | null;
  changeLabel?: string;
  /** Hướng tăng là tốt hay xấu (vd. người nghỉ tăng là xấu): chỉ đổi độ đậm của nhãn, chữ đã nói đủ. */
  upIsGood?: boolean;
  /** Đơn vị của số chênh lệch (vd. "%" hay " điểm"). */
  changeUnit?: string;
  href?: string;
  className?: string;
};

/** Thẻ số màu đặc ở hàng đầu mỗi tab: nền gradient theo nhóm chức năng, chữ trắng, icon lớn mờ ở góc. */
export function HeroStat({
  label,
  value,
  icon: Icon,
  tone,
  detail,
  change,
  changeLabel,
  upIsGood = true,
  changeUnit = "",
  href,
  className,
}: HeroStatProps) {
  const ArrowIcon = change?.direction === "up" ? ArrowUpRightIcon : change?.direction === "down" ? ArrowDownRightIcon : ArrowRightIcon;
  const good = change ? (change.direction === "flat" ? null : (change.direction === "up") === upIsGood) : null;

  const body = (
    <>
      <Icon aria-hidden className="pointer-events-none absolute -right-3 -bottom-4 size-24 text-hero-foreground/15" strokeWidth={1.5} />
      <span className="relative text-sm font-medium text-hero-foreground/90">{label}</span>
      <span className="relative text-3xl font-semibold tracking-tight">{value}</span>
      <div className="relative flex min-h-6 flex-wrap items-center gap-2 text-xs text-hero-foreground/85">
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold",
              good === false ? cn("bg-hero-foreground", TONE_INK[tone]) : "bg-hero-foreground/20 text-hero-foreground",
            )}
          >
            <ArrowIcon className="size-3.5" aria-hidden />
            {change.value > 0 ? "+" : ""}
            {change.value}
            {changeUnit}
          </span>
        )}
        {change && changeLabel && <span>{changeLabel}</span>}
        {!change && detail}
      </div>
    </>
  );

  const classes = cn(
    "relative grid min-h-32 content-between gap-1 overflow-hidden rounded-xl p-4 text-hero-foreground shadow-sm",
    TONE_CLASS[tone],
    className,
  );
  return href ? (
    <Link href={href} className={cn(classes, "transition-[filter] hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** Hàng thẻ màu đặc: 1 cột trên điện thoại, 2 trên tablet, đủ hàng trên desktop. */
export function HeroRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
