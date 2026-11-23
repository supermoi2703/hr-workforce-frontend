"use client";

import { useState } from "react";
import { ClockPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayIsoDate } from "@/lib/format";
import { useMyOvertime } from "../hooks";
import { isValidMonth } from "../rules";
import { OvertimeFormDialog } from "./overtime-form-dialog";
import { OvertimeList } from "./overtime-list";
import { UsageSummary } from "./usage-summary";

/** "Làm thêm giờ của tôi": mức đã dùng so với trần, phiếu trong tháng (Đồng ý / Từ chối / Rút), khai báo làm thêm. */
export function MyOvertimePage() {
  const t = useTranslations("Overtime");
  const [monthInput, setMonthInput] = useState(todayIsoDate().slice(0, 7));
  const [claiming, setClaiming] = useState(false);
  const month = isValidMonth(monthInput) ? monthInput : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Input
              type="month"
              className="w-40"
              value={monthInput}
              aria-label={t("month")}
              onChange={(e) => setMonthInput(e.target.value)}
            />
            <Button onClick={() => setClaiming(true)}>
              <ClockPlusIcon /> {t("claim")}
            </Button>
          </>
        }
      />
      {month ? <MonthContent month={month} /> : <EmptyState title={t("pickMonth")} />}
      {claiming && <OvertimeFormDialog mode="claim" onClose={() => setClaiming(false)} />}
    </div>
  );
}

function MonthContent({ month }: { month: string }) {
  const t = useTranslations("Overtime.list");
  const query = useMyOvertime(month);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      <UsageSummary usage={query.data.usage} />
      {query.data.items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} className="border border-dashed" />
      ) : (
        <OvertimeList items={query.data.items} forMe />
      )}
    </div>
  );
}
