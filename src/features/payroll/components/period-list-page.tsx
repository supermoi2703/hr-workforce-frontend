"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { PageHeader } from "@/components/shared/page-header";
import { RequireAccess } from "@/components/shared/require-access";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, formatNumber, todayIsoDate } from "@/lib/format";
import { useOpenPeriod, usePayrollErrorMessage, usePeriods } from "../hooks";
import { isValidMonth } from "../status";
import { PeriodStatusBadge } from "./status-badge";

const MANAGE = { permissions: ["payroll:manage"] };

/** Danh sách kỳ lương theo năm. Nút "Mở kỳ" chỉ hiện khi có payroll:manage (backend vẫn kiểm). */
export function PeriodListPage() {
  const t = useTranslations("Payroll");
  const thisYear = Number(todayIsoDate().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [opening, setOpening] = useState(false);
  const periods = usePeriods(year);

  const yearChoices = Array.from({ length: 7 }, (_, i) => String(thisYear + 1 - i)).map((value) => ({ value, label: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <div className="w-28">
              <ChoiceSelect
                value={String(year)}
                onChange={(value) => value && setYear(Number(value))}
                choices={yearChoices}
                ariaLabel={t("list.year")}
              />
            </div>
            <RequireAccess access={MANAGE} fallback={null}>
              <Button onClick={() => setOpening(true)}>
                <PlusIcon /> {t("list.openPeriod")}
              </Button>
            </RequireAccess>
          </>
        }
      />

      {periods.isPending ? (
        <LoadingState />
      ) : periods.error ? (
        <ErrorState error={periods.error} onRetry={() => periods.refetch()} />
      ) : periods.data.length === 0 ? (
        <EmptyState title={t("list.empty")} description={t("list.emptyHint", { year })} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("list.month")}</TableHead>
                <TableHead>{t("list.status")}</TableHead>
                <TableHead className="text-right">{t("list.employees")}</TableHead>
                <TableHead className="text-right">{t("list.gross")}</TableHead>
                <TableHead className="text-right">{t("list.net")}</TableHead>
                <TableHead>{t("list.publishedAt")}</TableHead>
                <TableHead>{t("list.complaintDeadline")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.data.map((row) => (
                <TableRow key={row.month}>
                  <TableCell>
                    <Link href={`/payroll/${row.month}`} className="font-medium hover:underline">
                      {row.month}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PeriodStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.employees)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.grossTotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.netTotal)}</TableCell>
                  <TableCell>{formatDateTime(row.publishedAt)}</TableCell>
                  <TableCell>{formatDate(row.complaintDeadline)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {opening && <OpenPeriodDialog onClose={() => setOpening(false)} />}
    </div>
  );
}

function OpenPeriodDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Payroll.list");
  const errorMessage = usePayrollErrorMessage();
  const open = useOpenPeriod();
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7));

  async function submit() {
    try {
      await open.mutateAsync(month);
      toast.success(t("opened", { month }));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !open.isPending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("openTitle")}</DialogTitle>
          <DialogDescription>{t("openDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="payroll-open-month">{t("month")}</Label>
          <Input id="payroll-open-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={open.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={!isValidMonth(month) || open.isPending}>
            {open.isPending && <Spinner />} {t("openConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
