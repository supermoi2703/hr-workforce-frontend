"use client";

import { useTranslations, type Messages } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatNumber, formatTime } from "@/lib/format";
import { useTimesheetHistory } from "../hooks";
import type { HistorySnapshot } from "../types";

export function DayHistory({ employeeId, date }: { employeeId: string; date: string }) {
  const t = useTranslations("Timesheet.history");
  const actions = useTranslations("Timesheet.history.actions");
  const history = useTimesheetHistory(employeeId, date);

  if (history.isPending) return <LoadingState />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => history.refetch()} />;
  if (!history.data.length) return <EmptyState title={t("empty")} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("at")}</TableHead>
            <TableHead>{t("actor")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead>{t("change")}</TableHead>
            <TableHead>{t("reason")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.data.map((entry, index) => {
            const action = entry.action as keyof Messages["Timesheet"]["history"]["actions"];
            return (
              <TableRow key={`${entry.at}-${index}`}>
                <TableCell>{formatDateTime(entry.at)}</TableCell>
                <TableCell>{entry.actorName ?? t("system")}</TableCell>
                <TableCell>{actions.has(action) ? actions(action) : t("unknownAction")}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="grid min-w-40 gap-1">
                    <div><strong>{t("before")}</strong> <Snapshot value={entry.before} /></div>
                    <div><strong>{t("after")}</strong> <Snapshot value={entry.after} /></div>
                  </div>
                </TableCell>
                <TableCell className="min-w-32 whitespace-normal wrap-break-word">{entry.reason || "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Snapshot({ value }: { value: HistorySnapshot | null }) {
  const t = useTranslations("Timesheet");
  if (!value) return "—";
  return t("history.snapshot", {
    status: value.status && t.has(`status.${value.status}`) ? t(`status.${value.status}`) : "—",
    units: formatNumber(value.paidUnits),
    checkIn: formatTime(value.firstIn),
    checkOut: formatTime(value.lastOut),
    late: value.lateMinutes ?? "—",
  });
}
