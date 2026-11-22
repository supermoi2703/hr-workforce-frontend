"use client";

import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { assignWarning, hoursText } from "../work-rules";
import type { AssignPreview, LoadSummary, WorkloadZone } from "../work-types";

const DOT: Record<WorkloadZone, string> = {
  GREEN: "bg-success",
  YELLOW: "bg-warning",
  RED: "bg-destructive",
};

/** Chấm màu vùng tải (xanh / vàng / đỏ), kèm tên vùng cho trình đọc màn hình. */
export function ZoneDot({ zone, className }: { zone: WorkloadZone; className?: string }) {
  const t = useTranslations("Workload");
  return (
    <span
      role="img"
      aria-label={t(`zone.${zone}`)}
      title={t(`zone.${zone}`)}
      className={cn("inline-block size-2 shrink-0 rounded-full", DOT[zone], className)}
    />
  );
}

/**
 * Cảnh báo tải khi giao việc (workload bước 3): vàng "cần thỏa thuận", đỏ "sẽ quá tải" kèm lý do; xanh không hiện gì.
 * Không chặn: đỏ thì nơi gọi hỏi xác nhận trước khi lưu.
 */
export function AssignLoadNotice({ preview, name, pending }: { preview: AssignPreview | undefined; name: string; pending: boolean }) {
  const t = useTranslations("Workload");
  if (pending) return <p className="text-xs text-muted-foreground">{t("assignChecking")}</p>;
  if (preview && !preview.scheduled) return <p className="text-xs text-muted-foreground">{t("assignUnscheduled")}</p>;
  const warning = assignWarning(preview);
  if (!warning) return null;
  const peak = warning.peak;
  const values = {
    name,
    week: peak ? formatDate(peak.weekStart) : "—",
    load: peak ? hoursText(peak.loadMinutes) : "—",
    capacity: peak ? hoursText(peak.capacityMinutes) : "—",
    percent: peak?.percent == null ? "—" : `${peak.percent}%`,
  };
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs",
        warning.zone === "RED" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <ZoneDot zone={warning.zone} className="mt-1" />
      <span>
        {warning.zone === "RED"
          ? t("assignRed", { ...values, reasons: warning.reasons.map((reason) => t(`reason.${reason}`)).join(", ") })
          : t("assignYellow", values)}
      </span>
    </p>
  );
}

/**
 * Một dòng tóm tắt tải tính từ task: chấm vùng, tuần nặng nhất "giờ / năng lực", lý do khi không xanh, giờ chưa lên lịch.
 * `compact`: chỉ chấm và tuần nặng nhất (danh sách ứng viên).
 */
export function LoadLine({ load, compact = false, className }: { load: LoadSummary; compact?: boolean; className?: string }) {
  const t = useTranslations("Workload");
  const peak = load.peakWeek;
  // Danh sách gọn luôn ghi "giờ / năng lực" (kể cả 0) để các dòng thẳng hàng; bản đầy đủ thì nói "chưa có việc".
  const busy = peak !== null && (compact || peak.loadMinutes > 0);
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground", className)}>
      <ZoneDot zone={load.zone} />
      <span className="tabular-nums">
        {busy
          ? compact
            ? t("peakShort", { load: hoursText(peak.loadMinutes), capacity: hoursText(peak.capacityMinutes) })
            : t("peak", { week: formatDate(peak.weekStart), load: hoursText(peak.loadMinutes), capacity: hoursText(peak.capacityMinutes) })
          : t("noLoad")}
      </span>
      {!compact && load.zone !== "GREEN" && (
        <span className={cn(load.zone === "RED" ? "text-destructive" : "text-warning")}>
          · {load.reasons.map((reason) => t(`reason.${reason}`)).join(", ")}
        </span>
      )}
      {!compact && load.unscheduledMinutes > 0 && <span>· {t("unscheduled", { hours: hoursText(load.unscheduledMinutes) })}</span>}
    </span>
  );
}
