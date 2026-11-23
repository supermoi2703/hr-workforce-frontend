"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { todayIsoDate } from "@/lib/format";
import { useProjectOvertime } from "../hooks";
import { isValidMonth } from "../rules";
import { OvertimeList } from "./overtime-list";

/** Tab "Làm thêm giờ" của dự án (chỉ PM): phiếu trong tháng của mọi người, PM hủy được phiếu đã giao trước giờ bắt đầu. */
export function ProjectOvertimeTab({ projectId }: { projectId: string }) {
  const t = useTranslations("Overtime.project");
  const [monthInput, setMonthInput] = useState(todayIsoDate().slice(0, 7));
  const month = isValidMonth(monthInput) ? monthInput : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Input type="month" className="w-40" value={monthInput} aria-label={t("month")} onChange={(e) => setMonthInput(e.target.value)} />
      </div>
      {month ? <ProjectMonth projectId={projectId} month={month} /> : <EmptyState title={t("pickMonth")} />}
    </div>
  );
}

function ProjectMonth({ projectId, month }: { projectId: string; month: string }) {
  const t = useTranslations("Overtime.project");
  const query = useProjectOvertime(projectId, month);
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} className="border border-dashed" />;
  }
  return <OvertimeList items={query.data} showEmployee showProject={false} />;
}
