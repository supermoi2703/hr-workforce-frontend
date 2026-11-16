"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime, todayIsoDate } from "@/lib/format";
import { buildResolveBody, nextMonth, validateResolve, type ResolveValues } from "../feedback";
import { useComplaints, usePayrollErrorMessage, useResolveComplaint } from "../hooks";
import { isValidMonth } from "../status";
import type { ComplaintView, FeedbackStatus } from "../types";
import { PayslipDrawer } from "./payslip-drawer";

const ALL = "ALL";

/** Xử lý thắc mắc của một kỳ: danh sách phân trang phía server, ngăn chi tiết và quyết định Chấp nhận / Từ chối. */
export function ComplaintPage({ initialMonth }: { initialMonth?: string }) {
  const t = useTranslations("Payroll.complaints");
  const [monthInput, setMonthInput] = useState(initialMonth && isValidMonth(initialMonth) ? initialMonth : previousMonth());
  const [status, setStatus] = useState<string>(ALL);
  const [selected, setSelected] = useState<ComplaintView | null>(null);
  const tableState = useDataTableState();
  const month = isValidMonth(monthInput) ? monthInput : null;
  const statusFilter = status === ALL ? undefined : (status as FeedbackStatus);

  const query = useComplaints({ month: month ?? "", status: statusFilter, page: tableState.pageParams.page, size: tableState.pageParams.size }, !!month);
  // Số thắc mắc còn mở: chặn đóng kỳ.
  const openCount = useComplaints({ month: month ?? "", status: "OPEN", page: 0, size: 1 }, !!month);

  function changeFilter(update: () => void) {
    update();
    if (tableState.pagination.pageIndex !== 0) tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
  }

  const columns = useMemo(() => {
    const col = createDataTableColumns<ComplaintView>();
    return col.columns([
      col.display({
        id: "employee",
        header: t("employee"),
        cell: (c) => (
          <span className="min-w-0">
            <span className="block truncate font-medium">{c.row.original.fullName ?? "—"}</span>
            <span className="block font-mono text-xs text-muted-foreground">{c.row.original.employeeCode ?? c.row.original.employeeId.slice(0, 8)}</span>
          </span>
        ),
      }),
      col.accessor("createdAt", { header: t("sentAt"), cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor("note", {
        header: t("note"),
        cell: (c) => <span className="line-clamp-2 max-w-72 whitespace-normal">{c.getValue() ?? "—"}</span>,
      }),
      col.display({
        id: "status",
        header: t("status"),
        cell: (c) => <StatusBadge complaint={c.row.original} />,
      }),
      col.display({
        id: "open",
        header: () => <span className="sr-only">{t("open")}</span>,
        cell: (c) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original)}>
            {t("open")}
          </Button>
        ),
      }),
    ]);
  }, [t]);

  return (
    <div className="space-y-6">
      <Link href={month ? `/payroll/${month}` : "/payroll"} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeftIcon /> {t("back")}
      </Link>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Input
              type="month"
              className="w-40"
              value={monthInput}
              aria-label={t("period")}
              onChange={(e) => changeFilter(() => setMonthInput(e.target.value))}
            />
            <div className="w-40">
              <ChoiceSelect
                value={status}
                onChange={(value) => changeFilter(() => setStatus(value || ALL))}
                choices={[
                  { value: ALL, label: t("statusAll") },
                  { value: "OPEN", label: t("statusOpen") },
                  { value: "RESOLVED", label: t("statusResolved") },
                ]}
                ariaLabel={t("status")}
              />
            </div>
          </>
        }
      />

      {!month ? (
        <EmptyState title={t("pickPeriod")} />
      ) : (
        <>
          {openCount.data && (
            <p className="text-sm text-muted-foreground">
              {openCount.data.totalElements > 0
                ? t("openBlocking", { count: openCount.data.totalElements })
                : t("noneOpen")}
            </p>
          )}
          <DataTable
            columns={columns}
            query={query}
            {...tableState.bind}
            sorting={undefined}
            onSortingChange={undefined}
            getRowId={(row) => row.id}
            empty={<EmptyState title={t("empty")} />}
          />
        </>
      )}

      <ComplaintSheet complaint={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const previousMonth = () => {
  const [year, month] = todayIsoDate().slice(0, 7).split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
};

function StatusBadge({ complaint }: { complaint: ComplaintView }) {
  const t = useTranslations("Payroll.complaints");
  if (complaint.status === "OPEN") return <Badge variant="warning">{t("stateOpen")}</Badge>;
  return complaint.decision === "ACCEPTED" ? (
    <Badge variant="success">{t("stateAccepted")}</Badge>
  ) : (
    <Badge variant="destructive">{t("stateRejected")}</Badge>
  );
}

function ComplaintSheet({ complaint, onClose }: { complaint: ComplaintView | null; onClose: () => void }) {
  const t = useTranslations("Payroll.complaints");
  const [viewing, setViewing] = useState(false);
  return (
    <>
      <Sheet open={complaint !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {complaint && (
            <>
              <SheetHeader>
                <SheetTitle>{complaint.fullName ?? t("title")}</SheetTitle>
                <SheetDescription>
                  {complaint.employeeCode ?? complaint.employeeId.slice(0, 8)} · {complaint.month} · {formatDateTime(complaint.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">{t("note")}</h3>
                  <p className="whitespace-pre-wrap text-sm">{complaint.note ?? "—"}</p>
                  <Button variant="outline" size="sm" onClick={() => setViewing(true)}>
                    {t("viewPayslip")}
                  </Button>
                </section>
                {complaint.status === "OPEN" ? (
                  // key: mỗi thắc mắc một form riêng, không giữ chữ đang gõ của thắc mắc trước.
                  <ResolveForm key={complaint.id} complaint={complaint} onDone={onClose} />
                ) : (
                  <section className="space-y-1 text-sm">
                    <StatusBadge complaint={complaint} />
                    {complaint.decisionReason && <p>{complaint.decisionReason}</p>}
                    {complaint.handledAt && <p className="text-xs text-muted-foreground">{formatDateTime(complaint.handledAt)}</p>}
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {complaint && <PayslipDrawer month={complaint.month} employeeId={viewing ? complaint.employeeId : null} onClose={() => setViewing(false)} />}
    </>
  );
}

function ResolveForm({ complaint, onDone }: { complaint: ComplaintView; onDone: () => void }) {
  const t = useTranslations("Payroll.complaints");
  const tErr = useTranslations("Payroll.errors");
  const errorMessage = usePayrollErrorMessage();
  const resolve = useResolveComplaint();
  const [values, setValues] = useState<ResolveValues>({
    decision: "ACCEPTED",
    reason: "",
    amount: "",
    targetMonth: nextMonth(complaint.month),
  });
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateResolve(values, complaint.month) : {};
  const set = <K extends keyof ResolveValues>(key: K, value: ResolveValues[K]) => setValues((c) => ({ ...c, [key]: value }));
  const fieldError = (key: keyof typeof errors) => (errors[key] ? <p className="text-xs text-destructive">{t(`validation.${errors[key]}`)}</p> : null);

  async function save() {
    setTouched(true);
    if (Object.keys(validateResolve(values, complaint.month)).length > 0) return;
    try {
      await resolve.mutateAsync({ id: complaint.id, body: buildResolveBody(values) });
      toast.success(t("resolved"));
      onDone();
    } catch (error) {
      // Lỗi kỳ nhận điều chỉnh có câu riêng cho màn này.
      if (isApiError(error) && error.code === "PAYROLL_PERIOD_LOCKED_FOR_INPUT") toast.error(tErr("targetLocked"));
      else if (isApiError(error) && error.code === "PAYROLL_PERIOD_NOT_FOUND") toast.error(tErr("targetNotFound"));
      else toast.error(errorMessage(error));
    }
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("decision")}>
        {(["ACCEPTED", "REJECTED"] as const).map((decision) => (
          <Button
            key={decision}
            type="button"
            role="radio"
            aria-checked={values.decision === decision}
            variant={values.decision === decision ? "default" : "outline"}
            onClick={() => set("decision", decision)}
          >
            {decision === "ACCEPTED" ? t("accept") : t("reject")}
          </Button>
        ))}
      </div>

      {values.decision === "ACCEPTED" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="resolve-amount">{t("amount")}</Label>
            <Input id="resolve-amount" inputMode="decimal" value={values.amount} aria-invalid={!!errors.amount} onChange={(e) => set("amount", e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("amountHint")}</p>
            {fieldError("amount")}
          </div>
          <div className="space-y-1">
            <Label htmlFor="resolve-target">{t("targetMonth")}</Label>
            <Input id="resolve-target" type="month" value={values.targetMonth} aria-invalid={!!errors.targetMonth} onChange={(e) => set("targetMonth", e.target.value)} />
            {fieldError("targetMonth")}
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label htmlFor="resolve-reason">{t("reason")}</Label>
        <Textarea id="resolve-reason" rows={3} maxLength={1000} value={values.reason} aria-invalid={!!errors.reason} onChange={(e) => set("reason", e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
        {fieldError("reason")}
      </div>

      <Button onClick={save} disabled={resolve.isPending}>
        {resolve.isPending && <Spinner />} {t("save")}
      </Button>
    </section>
  );
}
