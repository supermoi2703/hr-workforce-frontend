"use client";

import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { foldParts, type DonutPart } from "../rules";

const MAX_PARTS = 6;

type DonutChartProps = {
  /** Các phần đã gắn màu theo nhóm (`withSeriesColors`); phần bằng 0 tự bỏ. */
  parts: DonutPart[];
  /** Số lớn ở giữa (mặc định: tổng). */
  centerValue?: string;
  centerLabel: string;
  /** Nhãn mô tả cho trình đọc màn hình. */
  title: string;
  /** Định dạng giá trị trong chú thích (mặc định: số). */
  format?: (value: number) => string;
  className?: string;
};

/**
 * Donut có tổng ở giữa và chú thích bên cạnh (ô màu, nhãn, số, %). Tối đa 6 phần, dư thì gộp "Khác". Chỉ một phần thì
 * không vẽ vòng (một màu không nói lên gì): hiện một dòng số.
 */
export function DonutChart({ parts, centerValue, centerLabel, title, format, className }: DonutChartProps) {
  const t = useTranslations("Dashboard.Common");
  const shown = foldParts(parts, MAX_PARTS, t("other"));
  const total = shown.reduce((sum, part) => sum + part.value, 0);
  const show = (value: number) => (format ? format(value) : formatNumber(value));

  if (shown.length <= 1) {
    const only = shown[0];
    return (
      <div className={cn("grid place-items-center gap-1 py-6 text-center", className)}>
        <span className="text-3xl font-semibold">{show(total)}</span>
        <span className="text-sm text-muted-foreground">{only ? only.label : centerLabel}</span>
      </div>
    );
  }

  const config = Object.fromEntries(shown.map((part) => [part.key, { label: part.label, color: part.color }])) satisfies ChartConfig;
  const summary = shown.map((part) => `${part.label} ${show(part.value)}`).join(", ");

  return (
    // Xếp theo độ rộng của ô chứa (container query): ô hẹp thì chú thích xuống dưới vòng.
    <div className={cn("@container", className)}>
      <div className="grid items-center gap-4 @md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-44">
          <ChartContainer config={config} className="aspect-square w-full" role="img" aria-label={`${title}: ${summary}`}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
              <Pie
                data={shown}
                dataKey="value"
                nameKey="key"
                innerRadius="64%"
                outerRadius="100%"
                paddingAngle={shown.length > 1 ? 1.5 : 0}
                cornerRadius={3}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {shown.map((part) => (
                  <Cell key={part.key} fill={part.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="text-2xl font-semibold leading-none">{centerValue ?? show(total)}</span>
            <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <ul className="grid gap-1.5 text-sm">
          {shown.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: part.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{part.label}</span>
              <span className="font-medium tabular-nums">{show(part.value)}</span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {total ? Math.round((part.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
