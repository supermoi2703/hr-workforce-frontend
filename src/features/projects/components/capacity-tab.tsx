"use client";

import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCapacity } from "../work-hooks";
import { formatMinutes, loadTone, type LoadTone } from "../work-rules";
import type { Project } from "../types";
import type {  } from "../work-types";
import { PersonChip } from "./badges";

const TONE: Record<LoadTone, string> = {
  over: "bg-destructive/15 text-destructive",
  high: "bg-warning/15",
  normal: "bg-success/10",
  low: "bg-muted/40",
  off: "bg-muted text-muted-foreground",
};

/** S7: người × tuần. Năng lực = lịch văn phòng − nghỉ đã duyệt; tải = giờ còn lại của việc có hạn trong tuần, trên mọi dự án. */
export function CapacityTab({ project }: { project: Project }) {
  const t = useTranslations("ProjectWork");
  const capacity = useCapacity(project.id);
  if (capacity.isPending) return <LoadingState />;
  if (capacity.isError) return <ErrorState error={capacity.error} onRetry={() => capacity.refetch()} />;

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("capacityHint")}</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("person")}</TableHead>
              {capacity.data.weeks.map((week) => (
                <TableHead key={week} className="text-center">
                  {formatDate(week)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {capacity.data.people.map((row) => (
              <TableRow key={row.person.id}>
                <TableCell>
                  <PersonChip person={row.person} />
                </TableCell>
                {row.weeks.map((cell) => (
                  <TableCell key={cell.weekStart} className={cn("text-center tabular-nums", TONE[loadTone(cell)])}>
                    <div>
                      {formatMinutes(cell.loadMinutes)} / {formatMinutes(cell.capacityMinutes)}
                    </div>
                    {cell.leaveDays > 0 && <div className="text-xs">{t("leaveDays", { days: cell.leaveDays })}</div>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
