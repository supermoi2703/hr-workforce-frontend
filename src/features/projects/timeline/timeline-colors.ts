import type { CSSProperties } from "react";
import type { TaskStatus, WorkPhase } from "../work-types";

// Màu của dòng thời gian (workload bước 5, Quang chốt 25/11): thanh việc tô theo giai đoạn của nhóm công việc, trạng
// thái thể hiện bằng độ đậm. Xanh lá / cam / đỏ để dành cho vùng tải. Dùng token biểu đồ trong globals.css nên chế độ
// tối tự đổi theo.

/** Giai đoạn → biến màu: tím = phân tích & thiết kế, xanh dương = lập trình, xanh ngọc = kiểm thử & vận hành. */
export const PHASE_COLOR: Record<WorkPhase, string> = {
  ANALYSIS_DESIGN: "var(--chart-5)",
  DEVELOPMENT: "var(--chart-1)",
  TESTING_OPERATIONS: "var(--chart-2)",
};

/** Việc chưa có nhóm công việc. */
export const NO_PHASE_COLOR = "var(--muted-foreground)";

export function phaseColor(phase: WorkPhase | null): string {
  return phase === null ? NO_PHASE_COLOR : PHASE_COLOR[phase];
}

/** chưa làm: nền nhạt + viền; đang làm: màu đặc; xong / huỷ: xám. */
export type BarLook = "todo" | "doing" | "done";

export function barLook(status: TaskStatus): BarLook {
  if (status === "IN_PROGRESS" || status === "IN_REVIEW") return "doing";
  if (status === "TODO") return "todo";
  return "done";
}

/**
 * Biến CSS cho một thanh: `--bar` là màu giai đoạn; lớp Tailwind của thanh đọc biến này (xem `BAR_CLASS`). Màu đặc pha
 * thêm đen để chữ trắng đọc rõ ở cả màu xanh ngọc.
 */
export function barStyle(phase: WorkPhase | null): CSSProperties {
  return { "--bar": phaseColor(phase) } as CSSProperties;
}

export const BAR_CLASS: Record<BarLook, string> = {
  todo: "border bg-[color-mix(in_oklch,var(--bar)_13%,var(--card))] border-[color-mix(in_oklch,var(--bar)_45%,var(--card))] text-[color-mix(in_oklch,var(--bar)_72%,var(--foreground))]",
  doing:
    "border border-transparent bg-[color-mix(in_oklch,var(--bar)_86%,black)] text-white shadow-sm shadow-[color-mix(in_oklch,var(--bar)_35%,transparent)]",
  done: "border border-border bg-muted text-muted-foreground",
};
