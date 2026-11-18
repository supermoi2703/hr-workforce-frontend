import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tông của khối màu đặc (thẻ số trên Dashboard, băng tiêu đề), theo nhóm chức năng như `DomainTone`. Gradient định nghĩa ở
 * globals.css (`--hero-*`), chữ trắng đạt tương phản >= 5:1 ở cả hai theme.
 */
export type HeroTone = "project" | "people" | "time" | "approval" | "leave";

export const HERO_TONE_BG: Record<HeroTone, string> = {
  project: "bg-hero-project",
  people: "bg-hero-people",
  time: "bg-hero-time",
  approval: "bg-hero-approval",
  leave: "bg-hero-leave",
};

/** Một bước trên đường dẫn phía trên tiêu đề: có `href` thì là link, có `onClick` thì là nút, không có thì là chữ. */
export type HeroBannerStep = { key: string; label: string; href?: string; onClick?: () => void };

/** Một số phụ dưới số lớn, vd "4 phòng ban". */
export type HeroBannerStat = { key: string; icon: LucideIcon; label: ReactNode };

type HeroBannerProps = {
  tone: HeroTone;
  icon: LucideIcon;
  /** Tiêu đề cấp 2 (trang đã có h1 ở PageHeader). */
  title: ReactNode;
  path?: HeroBannerStep[];
  /** Nhãn cạnh tiêu đề, dùng `HeroBannerBadge`. */
  badges?: ReactNode;
  description?: ReactNode;
  /** Số lớn, vd số người; null / không truyền = không hiện. */
  value?: ReactNode;
  /** Chữ sau số lớn, vd "người". */
  valueLabel?: ReactNode;
  stats?: HeroBannerStat[];
  /** Nút bên phải tiêu đề. Nên dùng Button variant="outline" để đọc rõ trên nền màu ở cả hai theme. */
  actions?: ReactNode;
  className?: string;
};

const STEP_CLASS =
  "rounded-sm hover:text-hero-foreground hover:underline focus-visible:ring-2 focus-visible:ring-hero-foreground/60 focus-visible:outline-none";

/**
 * Băng tiêu đề nền gradient theo nhóm chức năng: đường dẫn, tiêu đề, số lớn và vài số phụ, icon lớn mờ ở góc. Là khối màu
 * đặc duy nhất của trang (quy ước ở docs/huong-dan-khung-frontend.md mục 7); phần còn lại của trang giữ nền trắng.
 */
export function HeroBanner({
  tone,
  icon: Icon,
  title,
  path,
  badges,
  description,
  value,
  valueLabel,
  stats,
  actions,
  className,
}: HeroBannerProps) {
  const hasFigures = value != null || (stats?.length ?? 0) > 0;
  return (
    <section className={cn("relative overflow-hidden p-5 text-hero-foreground", HERO_TONE_BG[tone], className)}>
      <Icon
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute -right-6 -bottom-10 size-40 text-hero-foreground/15"
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-hero-foreground/15" aria-hidden>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            {path && path.length > 0 && (
              <ol className="flex flex-wrap items-center gap-1 text-xs text-hero-foreground/80">
                {path.map((step, index) => (
                  <li key={step.key} className="flex items-center gap-1">
                    {index > 0 && <ChevronRightIcon className="size-3" aria-hidden />}
                    {step.href ? (
                      <Link href={step.href} className={STEP_CLASS}>
                        {step.label}
                      </Link>
                    ) : step.onClick ? (
                      <button type="button" onClick={step.onClick} className={STEP_CLASS}>
                        {step.label}
                      </button>
                    ) : (
                      <span>{step.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="min-w-0 break-words">{title}</span>
              {badges}
            </h2>
            {description && <p className="mt-0.5 text-sm text-hero-foreground/85">{description}</p>}
          </div>
        </div>
        {/* Nút outline có nền sáng ở theme sáng: đặt màu chữ thường cho khối nút, không để thừa hưởng chữ trắng của băng */}
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 text-foreground">{actions}</div>}
      </div>
      {hasFigures && (
        <div className="relative mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
          {value != null && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
              {valueLabel && <span className="text-sm text-hero-foreground/85">{valueLabel}</span>}
            </p>
          )}
          {stats && stats.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-hero-foreground/90">
              {stats.map(({ key, icon: StatIcon, label }) => (
                <li key={key} className="flex items-center gap-1.5">
                  <StatIcon className="size-4 shrink-0" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** Nhãn nhỏ cạnh tiêu đề của băng (mã đơn vị, "Ban Giám đốc"...). */
export function HeroBannerBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-hero-foreground/30 bg-hero-foreground/15 px-1.5 py-0.5 text-xs font-medium tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
