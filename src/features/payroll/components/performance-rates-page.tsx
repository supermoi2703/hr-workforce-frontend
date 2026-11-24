"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { RequireAccess } from "@/components/shared/require-access";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/format";
import { usePayrollErrorMessage, usePerformanceRatePositions, usePerformanceRates, useRemovePerformanceRate } from "../hooks";
import { canDeletePerformanceRate } from "../performance-rates";
import type { PerformanceRate } from "../types";
import { PerformanceRateDialog } from "./performance-rate-dialog";

export function PerformanceRatesPage() {
  return (
    <RequireAccess access={{ permissions: ["payroll:config"] }}>
      <PerformanceRatesContent />
    </RequireAccess>
  );
}

function PerformanceRatesContent() {
  const t = useTranslations("Payroll.performanceRates");
  const levelLabel = useTranslations("Employees.levels");
  const errorMessage = usePayrollErrorMessage();
  const rates = usePerformanceRates();
  const positions = usePerformanceRatePositions();
  const remove = useRemovePerformanceRate();
  const [adding, setAdding] = useState(false);
  const today = todayIsoDate();
  const positionsById = new Map(positions.data?.map((position) => [position.id, position.name]));

  async function deleteRate(rate: PerformanceRate) {
    if (!canDeletePerformanceRate(rate)) {
      await rates.refetch();
      return;
    }
    try {
      await remove.mutateAsync(rate.id);
      toast.success(t("deleted"));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={() => setAdding(true)} disabled={!positions.data}>
            <PlusIcon /> {t("add")}
          </Button>
        }
      />
      {positions.error && (
        <ErrorState title={t("positionsError")} error={positions.error} onRetry={() => positions.refetch()} />
      )}
      {rates.isPending ? (
        <LoadingState />
      ) : rates.error ? (
        <ErrorState error={rates.error} onRetry={() => rates.refetch()} />
      ) : rates.data.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("level")}</TableHead>
                <TableHead>{t("position")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("effectiveFrom")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.data.map((rate) => {
                const scheduled = canDeletePerformanceRate(rate, today);
                const position = rate.positionId === null
                  ? t("allPositions")
                  : positionsById.get(rate.positionId) ?? rate.positionId;
                return (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{levelLabel(rate.level)}</TableCell>
                    <TableCell>{position}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rate.amount)}</TableCell>
                    <TableCell>{formatDate(rate.effectiveFrom)}</TableCell>
                    <TableCell>
                      <Badge variant={rate.active ? "success" : scheduled ? "info" : "secondary"}>
                        {t(rate.active ? "active" : scheduled ? "scheduled" : "historical")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {scheduled && (
                        <ConfirmDialog
                          trigger={<Button variant="outline" size="sm" />}
                          triggerLabel={t("delete")}
                          title={t("deleteTitle")}
                          description={t("deleteDescription", {
                            level: levelLabel(rate.level),
                            position,
                            date: formatDate(rate.effectiveFrom),
                          })}
                          confirmLabel={t("delete")}
                          destructive
                          onConfirm={() => deleteRate(rate)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {adding && positions.data && <PerformanceRateDialog positions={positions.data} onClose={() => setAdding(false)} />}
    </div>
  );
}
