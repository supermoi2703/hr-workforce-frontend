"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { EyeOffIcon, UserRoundXIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconTile } from "@/components/shared/icon-tile";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { OrgChartPerson } from "../types";

/**
 * Quy ước hình của sơ đồ: một màu nhấn tím của nhóm Tổ chức cho đường nối (`diagram-line`), quầng ô giám đốc và ô icon;
 * chỗ trưởng còn trống viền nét đứt màu cam (`warning`); ô đang chọn viền xanh (`primary`) như mọi mục đang chọn của app.
 * Màu tím không dùng cho chữ nhỏ.
 */

/** Rê chuột và focus của mọi ô bấm được trên sơ đồ. */
export const DIAGRAM_INTERACTIVE =
  "transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Số người dạng viên thuốc xám. */
export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums",
        className,
      )}
    >
      <UsersRoundIcon className="size-3" aria-hidden />
      {count}
    </span>
  );
}

/** Thay ảnh đại diện khi chỗ trưởng còn trống (viền cam) hoặc bị ẩn vì ngoài phạm vi xem (xám). */
function PlaceholderAvatar({ hidden, size }: { hidden?: boolean; size: "sm" | "default" | "lg" }) {
  const Icon = hidden ? EyeOffIcon : UserRoundXIcon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-dashed",
        hidden ? "text-muted-foreground" : "border-warning/60 text-warning",
        size === "lg" ? "size-10" : size === "sm" ? "size-6" : "size-8",
      )}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-3" : "size-4"} />
    </span>
  );
}

export type UnitCardProps = {
  /** Người đứng đầu; null = chỗ trống. */
  person: OrgChartPerson | null;
  /** Đơn vị ngoài phạm vi xem: không có người đứng đầu là do bị ẩn, không phải chỗ trống. */
  hidden?: boolean;
  /** Vai trò của người đứng đầu: "Trưởng phòng", "Giám đốc"... */
  role: string;
  /** Tên đơn vị hiện dưới người đứng đầu. */
  unit?: string;
  /** null / không truyền = không hiện số người. */
  count?: number | null;
  active?: boolean;
  onClick?: () => void;
  /** Ô giám đốc ở đầu sơ đồ và đầu mọi chuỗi báo cáo: to hơn, có quầng tím nhạt. */
  apex?: boolean;
  /** Ô gốc to hơn một chút. */
  emphasis?: boolean;
  /** Rộng hơn, cho chuỗi báo cáo dọc (không phải chia chỗ theo chiều ngang). */
  wide?: boolean;
};

/** Ô một người đứng đầu: người trước, đơn vị và số người sau. Dùng cho giám đốc và chuỗi báo cáo. */
export function UnitCard({ person, hidden, role, unit, count, active, onClick, apex, emphasis, wide }: UnitCardProps) {
  const t = useTranslations("Organization.Diagram");
  const large = apex || emphasis;
  const vacant = !person && !hidden;
  const content = (
    <>
      <span className="flex items-center gap-2.5">
        {person ? (
          <UserAvatar
            name={person.fullName}
            seed={person.employeeCode}
            size={large ? "lg" : "default"}
            className={apex ? "ring-2 ring-chart-5/30" : undefined}
          />
        ) : (
          <PlaceholderAvatar hidden={hidden} size={large ? "lg" : "default"} />
        )}
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate font-medium",
              apex && "text-base",
              vacant && "text-warning",
              !person && hidden && "text-muted-foreground",
            )}
            title={person?.fullName}
          >
            {person ? person.fullName : t(hidden ? "hidden" : "vacant")}
          </span>
          <span className="truncate text-xs text-muted-foreground">{role}</span>
        </span>
      </span>
      {(unit || count != null) && (
        <span className="mt-2.5 flex items-start justify-between gap-2 border-t pt-2 text-xs">
          <span className="line-clamp-2 min-w-0 text-foreground/80" title={unit}>
            {unit}
          </span>
          {count != null && <CountPill count={count} />}
        </span>
      )}
    </>
  );

  const className = cn(
    "flex flex-col rounded-xl border bg-card p-3 text-left text-sm shadow-xs",
    large || wide ? "w-60" : "w-48",
    apex && "border-chart-5/40 shadow-sm ring-4 ring-chart-5/10",
    vacant && "border-dashed border-warning/50",
    !person && hidden && "border-dashed",
    active && "border-primary ring-2 ring-primary/20",
  );

  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button type="button" onClick={onClick} aria-current={active ? "true" : undefined} className={cn(className, DIAGRAM_INTERACTIVE)}>
      {content}
    </button>
  );
}

type UnitTileProps = {
  icon: LucideIcon;
  name: string;
  /** null / không truyền = không hiện số người (đơn vị ngoài phạm vi xem). */
  count?: number | null;
  /** Người đứng đầu: null = chỗ trống (hoặc bị ẩn nếu `hidden`); không truyền = ô không có dòng người. */
  person?: OrgChartPerson | null;
  hidden?: boolean;
  role?: string;
  /** Viền nét đứt: nhóm không phải đơn vị thật, vd "Trực thuộc phòng". */
  dashed?: boolean;
  onClick: () => void;
  /** Mặc định rộng 11rem (`w-44`); cột phòng tự giãn thì truyền `w-full`. */
  className?: string;
};

/**
 * Ô một đơn vị: tên đơn vị và số người trước, người đứng đầu sau. Dùng cho phòng trên sơ đồ công ty và team trên sơ đồ
 * phòng, nơi cái cần đọc là cơ cấu đơn vị.
 */
export function UnitTile({ icon, name, count, person, hidden, role, dashed, onClick, className }: UnitTileProps) {
  const t = useTranslations("Organization.Diagram");
  const tDetail = useTranslations("Organization.Detail");
  const vacant = person === null && !hidden;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-44 flex-col gap-2 rounded-xl border bg-card p-2.5 text-left text-sm shadow-xs",
        (dashed || person === null) && "border-dashed",
        vacant && "border-warning/50",
        DIAGRAM_INTERACTIVE,
        className,
      )}
    >
      <span className="flex items-start gap-2">
        <IconTile icon={icon} tone="people" className="size-7 rounded-md" />
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 leading-snug font-medium" title={name}>
            {name}
          </span>
          {count != null && (
            <span className="text-xs text-muted-foreground tabular-nums">{tDetail("people", { count })}</span>
          )}
        </span>
      </span>
      {person !== undefined && (
        <span className="flex items-center gap-2 border-t pt-2">
          {person ? (
            <UserAvatar name={person.fullName} seed={person.employeeCode} size="sm" />
          ) : (
            <PlaceholderAvatar hidden={hidden} size="sm" />
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className={cn(
                "truncate text-xs font-medium",
                vacant && "text-warning",
                !person && hidden && "text-muted-foreground",
              )}
              title={person?.fullName}
            >
              {person ? person.fullName : t(hidden ? "hidden" : "vacant")}
            </span>
            {role && <span className="truncate text-xs text-muted-foreground">{role}</span>}
          </span>
        </span>
      )}
    </button>
  );
}

/** Ô một thành viên ở tầng cuối sơ đồ (dưới trưởng team): dạng viên thuốc, gọn hơn ô đơn vị. */
export function MemberCard({
  name,
  seed,
  position,
  onClick,
}: {
  name: string;
  seed: string;
  position?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-48 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-left text-sm shadow-xs",
        DIAGRAM_INTERACTIVE,
      )}
    >
      <UserAvatar name={name} seed={seed} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium" title={name}>
          {name}
        </span>
        {position && <span className="truncate text-xs text-muted-foreground">{position}</span>}
      </span>
    </button>
  );
}

/**
 * Người đứng đầu và các ô bên dưới xếp thành lưới tự xuống dòng trong một khung (không tràn ngang dù 20 người), nối với ô
 * trên bằng một đường dọc. Dùng cho thành viên dưới trưởng team, và cho các ô con khi một hàng ngang không đủ chỗ.
 */
export function MemberTier({ root, members, label }: { root: ReactNode; members: ReactNode[]; label: string }) {
  return (
    <figure aria-label={label} className="flex w-full flex-col items-center">
      {root}
      {members.length > 0 && (
        <>
          <span className="h-6 w-0.5 bg-diagram-line" aria-hidden />
          <div className="flex w-full max-w-3xl flex-wrap items-start justify-center gap-3 rounded-2xl border border-dashed border-diagram-line bg-card/70 p-4">
            {members}
          </div>
        </>
      )}
    </figure>
  );
}

type OrgDiagramProps = {
  root: ReactNode;
  /** Các ô cấp dưới, nối với ô gốc bằng đường kẻ kiểu sơ đồ tổ chức. */
  items: { key: string; node: ReactNode }[];
  /** Nhãn cho trình đọc màn hình, vd "Sơ đồ phòng Phát triển phần mềm". */
  label: string;
  /**
   * Ô con tự giãn khi còn chỗ thay vì giữ 11rem: một hàng thì chia đều bề ngang (tối đa 14rem mỗi ô), lưới thì 12rem,
   * điện thoại thì tối đa 16rem. Ô con phải rộng `w-full`. Dùng cho cột phòng của sơ đồ công ty.
   */
  stretch?: boolean;
};

/** Bề rộng một ô con trên hàng ngang: ô w-44 (11rem) + px-1 hai bên = 11.5rem. */
const ROW_ITEM_REM = 11.5;

/**
 * Đo bề rộng khung: các ô con vừa một hàng thì vẽ hàng ngang có đường nối, không vừa thì xếp lưới (không bắt người dùng
 * cuộn ngang). Đo lại khi khung đổi cỡ (thu sidebar, xoay màn hình).
 */
function useFitsInRow(itemCount: number, itemRem = ROW_ITEM_REM) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const remPx = typeof window === "undefined" ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return { ref, fits: width === 0 || itemCount * itemRem * remPx <= width };
}

/**
 * Sơ đồ ô gốc ở trên, các ô con ở dưới (ô con có thể là cả một cột, vd phòng kèm các team). Đủ chỗ thì một hàng có đường
 * nối, không đủ thì xếp lưới trong khung, màn hình hẹp thì xếp dọc. Ô con rộng 11rem (`UnitTile`).
 */
export function OrgDiagram({ root, items, label, stretch }: OrgDiagramProps) {
  const { ref, fits } = useFitsInRow(items.length);
  return (
    <div ref={ref} className="w-full">
      <div className="hidden md:block">
        {fits ? (
          <figure aria-label={label} className="overflow-x-auto pb-2 [scrollbar-width:thin]">
            <HorizontalDiagram root={root} items={items} stretch={stretch} />
          </figure>
        ) : (
          <MemberTier
            label={label}
            root={root}
            members={items.map((item) => (
              <div key={item.key} className={cn("flex", stretch && "w-48")}>
                {item.node}
              </div>
            ))}
          />
        )}
      </div>
      {/* Màn hình hẹp: xếp dọc, các ô con thụt vào. Mỗi dòng tự vẽ đoạn dọc và nhánh ngang; dòng cuối chỉ vẽ tới nhánh để
          đường không chạy thừa xuống dưới. */}
      <figure aria-label={label} className="flex flex-col items-start md:hidden">
        {root}
        {items.length > 0 && (
          <ul className="ml-5 flex flex-col">
            {items.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "relative pt-3 pl-5",
                  "before:absolute before:top-0 before:left-0 before:h-full before:border-l-2 before:border-diagram-line last:before:h-9",
                  "after:absolute after:top-9 after:left-0 after:w-4 after:border-t-2 after:border-diagram-line",
                )}
              >
                {stretch ? <div className="w-full max-w-64">{item.node}</div> : item.node}
              </li>
            ))}
          </ul>
        )}
      </figure>
    </div>
  );
}

/**
 * Hàng ngang có đường nối. Đường vẽ bằng viền của ::before / ::after: nửa trái + nửa phải của đường ngang và đoạn dọc ở
 * giữa mỗi ô con.
 */
function HorizontalDiagram({ root, items, stretch }: Omit<OrgDiagramProps, "label">) {
  return (
    <div className={cn("mx-auto flex flex-col items-center px-2", stretch ? "w-full" : "w-max min-w-full")}>
      {root}
      {items.length > 0 && (
        <>
          <span className="h-6 w-0.5 bg-diagram-line" aria-hidden />
          <ul className={cn("flex", stretch && "w-full")}>
            {items.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "relative flex items-start justify-center px-1 pt-6",
                  // Tự giãn: các ô chia đều bề ngang (đã đo là đủ 11.5rem mỗi ô), ô con giãn tới 14rem
                  stretch && "flex-1 basis-0",
                  "before:absolute before:top-0 before:right-1/2 before:h-6 before:w-1/2 before:border-t-2 before:border-diagram-line",
                  "after:absolute after:top-0 after:left-1/2 after:h-6 after:w-1/2 after:border-t-2 after:border-l-2 after:border-diagram-line",
                  "first:before:hidden last:after:border-t-0",
                )}
              >
                {stretch ? <div className="w-full max-w-56">{item.node}</div> : item.node}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Chuỗi báo cáo dọc (giám đốc → trưởng phòng → trưởng team), ô cuối là đơn vị đang xem. */
export function ReportingChain({ steps, label }: { steps: { key: string; node: ReactNode }[]; label: string }) {
  return (
    <figure aria-label={label} className="flex flex-col items-center">
      {steps.map((step, index) => (
        <div key={step.key} className="flex w-full flex-col items-center">
          {index > 0 && <span className="h-5 w-0.5 bg-diagram-line" aria-hidden />}
          {step.node}
        </div>
      ))}
    </figure>
  );
}
