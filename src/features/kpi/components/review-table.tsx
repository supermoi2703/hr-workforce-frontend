"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { ReviewRow } from "../types";
import { KpiStatus } from "./common";

export function ReviewTable({ reviews, onSelect }: { reviews: ReviewRow[]; onSelect: (id: string) => void }) {
  const t = useTranslations("Kpi");
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("employee")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("onTime")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("attendance")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("pmScore")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("machine")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("adjusted")}</TableHead>
            <TableHead>{t("final")}</TableHead>
            <TableHead>{t("reviewStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <Button variant="link" className="h-auto max-w-full p-0 text-left whitespace-normal" onClick={() => onSelect(review.id)}>
                  {review.employeeName ?? review.employeeCode ?? "—"}
                </Button>
                {review.employeeCode && <div className="text-xs text-muted-foreground">{review.employeeCode}</div>}
              </TableCell>
              <TableCell className="hidden tabular-nums lg:table-cell">{formatNumber(review.onTimeScore)}</TableCell>
              <TableCell className="hidden tabular-nums lg:table-cell">{formatNumber(review.attendanceScore)}</TableCell>
              <TableCell className="hidden space-y-1 tabular-nums lg:table-cell">
                <div>{formatNumber(review.ratingScore)}</div>
                {review.pmNotRated && <Badge variant="warning">{t("missingRatings")}</Badge>}
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{formatNumber(review.machineCoefficient)}</TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{formatNumber(review.adjustedCoefficient)}</TableCell>
              <TableCell className="font-medium tabular-nums">{formatNumber(review.finalCoefficient)}</TableCell>
              <TableCell><KpiStatus status={review.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
