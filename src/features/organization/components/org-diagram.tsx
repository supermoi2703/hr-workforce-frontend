"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { UserRoundXIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { OrgChartPerson } from "../types";

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
  /** Ô gốc to hơn một chút. */
  emphasis?: boolean;
  /** Rộng hơn, cho chuỗi báo cáo dọc (không phải chia chỗ theo chiều ngang). */
  wide?: boolean;
};

/** Một ô trên sơ đồ: người đứng đầu + đơn vị + số người. Bấm được thì là nút chọn đơn vị đó trên cây. */
export function UnitCard({ person, hidden, role, unit, count, active, onClick, emphasis, wide }: UnitCardProps) {
  const t = useTranslations("Organization.Diagram");
  const content = (
    <>
      <span className="flex items-center gap-2.5">
        {person ? (
          <UserAvatar name={person.fullName} seed={person.employeeCode} size={emphasis ? "lg" : "default"} />
        ) : (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground",
              emphasis ? "size-10" : "size-8",
            )}
          >
            <UserRoundXIcon className="size-4" aria-hidden />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate font-medium", !person && "text-muted-foreground")} title={person?.fullName}>
            {person ? person.fullName : t(hidden ? "hidden" : "vacant")}
          </span>
          <span className="truncate text-xs text-muted-foreground">{role}</span>
        </span>
      </span>
      {(unit || count != null) && (
        <span className="mt-2 flex items-start justify-between gap-2 border-t pt-2 text-xs">
          <span className="line-clamp-2 min-w-0 text-foreground/80" title={unit}>
            {unit}
          </span>
          {count != null && (
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground tabular-nums">
              <UsersRoundIcon className="size-3" aria-hidden />
              {count}
            </span>
          )}
        </span>
      )}
    </>
  );

  const className = cn(
    "flex flex-col rounded-lg border bg-card p-2.5 text-left text-sm shadow-xs",
    emphasis || wide ? "w-60" : "w-48",
    !person && "border-dashed",
    active && "border-primary ring-2 ring-primary/20",
  );

  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        className,
        "transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      {content}
    </button>
  );
}

/** Ô một thành viên ở tầng cuối sơ đồ (dưới trưởng team): gọn hơn ô đơn vị, không bấm được. */
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
      className="flex w-44 items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-left text-sm shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <UserAvatar name={name} seed={seed} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium" title={name}>
          {name}
        </span>
        {position && <span className="truncate text-xs text-muted-foreground">{position}</span>}
      </span>
    </button>
  );
}

/**
 * Người đứng đầu và các thành viên trực tiếp bên dưới: thành viên xếp thành lưới tự xuống dòng trong một khung (không
 * tràn ngang dù 20 người), nối với ô trên bằng một đường dọc.
 */
export function MemberTier({ root, members, label }: { root: ReactNode; members: ReactNode[]; label: string }) {
  return (
    <figure aria-label={label} className="flex w-full flex-col items-center">
      {root}
      {members.length > 0 && (
        <>
          <span className="h-5 w-px bg-border" aria-hidden />
          <div className="flex w-full max-w-3xl flex-wrap justify-center gap-2 rounded-xl border border-dashed bg-background/60 p-3">
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
};

/**
 * Sơ đồ hai tầng: ô gốc ở trên, hàng ô con ở dưới, nối bằng đường kẻ. Nhiều ô con thì cuộn ngang trong khung.
 * Đường kẻ vẽ bằng viền của ::before / ::after: nửa trái + nửa phải của đường ngang và đoạn dọc ở giữa mỗi ô con.
 */
/** Bề rộng một ô con trên hàng ngang: ô w-48 (12rem) + px-1 hai bên = 12.5rem. */
const ROW_ITEM_REM = 12.5;

/**
 * Đo bề rộng khung: các ô con vừa một hàng thì vẽ hàng ngang có đường nối, không vừa thì xếp lưới (không bắt người dùng
 * cuộn ngang). Đo lại khi khung đổi cỡ (thu sidebar, xoay màn hình).
 */
function useFitsInRow(itemCount: number) {
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
  return { ref, fits: width === 0 || itemCount * ROW_ITEM_REM * remPx <= width };
}

export function OrgDiagram({ root, items, label }: OrgDiagramProps) {
  const { ref, fits } = useFitsInRow(items.length);
  return (
    <div ref={ref} className="w-full">
      <div className="hidden md:block">
        {fits ? (
          <figure aria-label={label} className="overflow-x-auto pb-2 [scrollbar-width:thin]">
            <HorizontalDiagram root={root} items={items} />
          </figure>
        ) : (
          <MemberTier
            label={label}
            root={root}
            members={items.map((item) => (
              <div key={item.key} className="flex">
                {item.node}
              </div>
            ))}
          />
        )}
      </div>
      {/* Màn hình hẹp: xếp dọc, các ô con thụt vào và nối với ô gốc bằng một đường dọc bên trái */}
      <figure aria-label={label} className="flex flex-col items-start md:hidden">
        {root}
        {items.length > 0 && (
          <ul className="ml-5 flex flex-col gap-2 border-l pt-2 pl-4">
            {items.map((item) => (
              <li
                key={item.key}
                className="relative before:absolute before:top-1/2 before:-left-4 before:w-3 before:border-t before:border-border"
              >
                {item.node}
              </li>
            ))}
          </ul>
        )}
      </figure>
    </div>
  );
}

function HorizontalDiagram({ root, items }: Omit<OrgDiagramProps, "label">) {
  return (
    <>
      <div className="mx-auto flex w-max min-w-full flex-col items-center px-2">
        {root}
        {items.length > 0 && (
          <>
            <span className="h-5 w-px bg-border" aria-hidden />
            <ul className="flex">
              {items.map((item) => (
                <li
                  key={item.key}
                  className={cn(
                    "relative flex justify-center px-1 pt-5",
                    "before:absolute before:top-0 before:right-1/2 before:h-5 before:w-1/2 before:border-t before:border-border",
                    "after:absolute after:top-0 after:left-1/2 after:h-5 after:w-1/2 after:border-t after:border-l after:border-border",
                    "first:before:hidden last:after:border-t-0",
                  )}
                >
                  {item.node}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/** Chuỗi báo cáo dọc (giám đốc → trưởng phòng → trưởng team), ô cuối là đơn vị đang xem. */
export function ReportingChain({ steps, label }: { steps: { key: string; node: ReactNode }[]; label: string }) {
  return (
    <figure aria-label={label} className="flex flex-col items-center">
      {steps.map((step, index) => (
        <div key={step.key} className="flex w-full flex-col items-center">
          {index > 0 && <span className="h-4 w-px bg-border" aria-hidden />}
          {step.node}
        </div>
      ))}
    </figure>
  );
}
