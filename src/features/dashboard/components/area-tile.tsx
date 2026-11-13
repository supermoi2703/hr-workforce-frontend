"use client";

import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { IconTile, type DomainTone } from "@/components/shared/icon-tile";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type AreaTileProps = {
  label: string;
  icon: LucideIcon;
  tone: DomainTone;
  value: ReactNode;
  detail?: ReactNode;
  /** Chuỗi theo thời gian, cũ → mới, kèm nhãn trục (tuần / tháng). */
  points: { label: string; value: number }[];
  /** Màu của vùng: biến CSS, vd. `var(--chart-1)`. */
  color: string;
  /** Tên chuỗi trong tooltip. */
  seriesLabel: string;
  unit?: string;
  className?: string;
};

/** Thẻ trắng: số ở trên, biểu đồ vùng màu chạy hết đáy thẻ (không trục; tooltip có số từng điểm). */
export function AreaTile({ label, icon, tone, value, detail, points, color, seriesLabel, unit = "", className }: AreaTileProps) {
  const gradientId = `area-${useId().replace(/:/g, "")}`;
  const config = { value: { label: seriesLabel, color } } satisfies ChartConfig;

  return (
    <div className={cn("grid content-between overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div className="grid gap-0.5">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
        </div>
        <IconTile icon={icon} tone={tone} className="size-8" />
      </div>
      <ChartContainer
        config={config}
        className="aspect-auto h-20 w-full"
        role="img"
        aria-label={`${seriesLabel}: ${points.map((point) => `${point.label} ${point.value}${unit}`).join(", ")}`}
      >
        <AreaChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={[0, "dataMax"]} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" formatter={(v) => `${seriesLabel}: ${v}${unit}`} />}
          />
          <Area
            dataKey="value"
            type="linear"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
