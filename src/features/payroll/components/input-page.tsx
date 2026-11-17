"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, HistoryIcon, HourglassIcon, LockIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeleteInput, useInputs, usePayrollErrorMessage, usePeriod } from "../hooks";
import {
  formatQuantity,
  INPUT_GROUP_ORDER,
  INPUT_GROUPS,
  inputsLockReason,
  inputValue,
  isMoneyCode,
  isValidReason,
  type InputGroup,
} from "../inputs";
import { displayName, employeeLabel } from "../names";
import { isValidMonth } from "../status";
import type { PayrollInput } from "../types";
import { InputFormDialog } from "./input-form-dialog";

/** Nhập khoản trong kỳ: thưởng, điều chỉnh, giờ OT, hệ số KPI. Chỉ sửa được khi có payroll:manage và kỳ chưa khóa. */
export function InputPage({ month }: { month: string }) {
  const t = useTranslations("Payroll.inputs");
  const valid = isValidMonth(month);
  const { can } = useCurrentUser();
  const period = usePeriod(valid ? month : "");
  const inputs = useInputs(month, undefined, false, valid);
  const [group, setGroup] = useState<InputGroup>("bonus");
  const [form, setForm] = useState<{ input?: PayrollInput } | null>(null);
  const [history, setHistory] = useState<{ id: string; label: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const back = (
    <Link href={`/payroll/${month}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeftIcon /> {t("back", { month })}
    </Link>
  );

  if (!valid) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title={t("notFound")} />
      </div>
    );
  }
  if (period.isPending) return <LoadingState />;
  if (period.error) {
    const notFound = isApiError(period.error) && period.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        {notFound ? <EmptyState title={t("notFound")} /> : <ErrorState error={period.error} onRetry={() => period.refetch()} />}
      </div>
    );
  }

  const lock = inputsLockReason(period.data.status, period.data.pendingApproval);
  const canEdit = can({ permissions: ["payroll:manage"] }) && lock === null;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={t("title", { month })}
        description={t("description")}
        actions={
          canEdit ? (
            <Button onClick={() => setForm({})}>
              <PlusIcon /> {t("add")}
            </Button>
          ) : undefined
        }
      />

      {lock && (
        <Alert>
          {lock === "pendingApproval" ? <HourglassIcon /> : <LockIcon />}
          <AlertTitle>{t(`lock.${lock}.title`)}</AlertTitle>
          <AlertDescription>{t(`lock.${lock}.description`)}</AlertDescription>
        </Alert>
      )}
      {!lock && !canEdit && (
        <Alert>
          <LockIcon />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert>
          <AlertTitle>{t("savedNotice.title")}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{t("savedNotice.description")}</p>
            <Link href={`/payroll/${month}`} className={buttonVariants({ size: "sm" })}>
              {t("savedNotice.go")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {inputs.isPending ? (
        <LoadingState />
      ) : inputs.error ? (
        <ErrorState error={inputs.error} onRetry={() => inputs.refetch()} />
      ) : (
        <Tabs value={group} onValueChange={(value) => setGroup(value as InputGroup)}>
          <TabsList>
            {INPUT_GROUP_ORDER.map((key) => (
              <TabsTrigger key={key} value={key}>
                {t(`groups.${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {INPUT_GROUP_ORDER.map((key) => (
            <TabsContent key={key} value={key}>
              <InputTable
                rows={inputs.data.filter((row) => INPUT_GROUPS[key].includes(row.code))}
                showSource={key === "adjust"}
                canEdit={canEdit}
                onEdit={(input) => setForm({ input })}
                onHistory={setHistory}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {form && (
        <InputFormDialog
          month={month}
          codes={INPUT_GROUPS[group]}
          input={form.input}
          onClose={() => setForm(null)}
          onSaved={() => setSaved(true)}
        />
      )}
      {history && <HistoryDialog month={month} employeeId={history.id} label={history.label} onClose={() => setHistory(null)} />}
    </div>
  );
}

type InputTableProps = {
  rows: PayrollInput[];
  showSource: boolean;
  canEdit: boolean;
  onEdit: (input: PayrollInput) => void;
  onHistory: (employee: { id: string; label: string }) => void;
};

function ValueCell({ input }: { input: PayrollInput }) {
  const value = inputValue(input);
  const money = isMoneyCode(input.code);
  return (
    <span className={cn("tabular-nums", money && value !== null && value < 0 && "text-destructive")}>
      {money ? formatCurrency(value) : formatQuantity(value)}
    </span>
  );
}

function InputTable({ rows, showSource, canEdit, onEdit, onHistory }: InputTableProps) {
  const t = useTranslations("Payroll.inputs");
  const errorMessage = usePayrollErrorMessage();
  const remove = useDeleteInput();
  const [deleting, setDeleting] = useState<PayrollInput | null>(null);

  if (rows.length === 0) return <EmptyState title={t("empty")} description={t("emptyHint")} />;
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("employee")}</TableHead>
              <TableHead>{t("code")}</TableHead>
              <TableHead className="text-right">{t("value")}</TableHead>
              {showSource && <TableHead>{t("sourceMonth")}</TableHead>}
              <TableHead>{t("reason")}</TableHead>
              <TableHead>{t("createdBy")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-normal" title={row.employeeId}>
                  {employeeLabel(row.employeeCode, row.fullName, row.employeeId)}
                </TableCell>
                <TableCell>{t(`codes.${row.code}`)}</TableCell>
                <TableCell className="text-right">
                  <ValueCell input={row} />
                </TableCell>
                {showSource && <TableCell>{row.adjustSourceMonth ?? "—"}</TableCell>}
                <TableCell className="max-w-64 whitespace-normal">{row.reason}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <span className="block">{displayName(row.createdByName, row.createdBy)}</span>
                  <time>{formatDateTime(row.createdAt)}</time>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={t("history")} title={t("history")} onClick={() => onHistory({ id: row.employeeId, label: employeeLabel(row.employeeCode, row.fullName, row.employeeId) })}>
                      <HistoryIcon />
                    </Button>
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon-sm" aria-label={t("edit")} title={t("edit")} onClick={() => onEdit(row)}>
                          <PencilIcon />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t("delete")} title={t("delete")} onClick={() => setDeleting(row)}>
                          <Trash2Icon />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {deleting && (
        <DeleteDialog
          input={deleting}
          onClose={() => setDeleting(null)}
          onDelete={async (reason) => {
            try {
              await remove.mutateAsync({ id: deleting.id, reason });
              toast.success(t("deleted"));
            } catch (error) {
              toast.error(errorMessage(error));
              throw error;
            }
          }}
        />
      )}
    </>
  );
}

function DeleteDialog({
  input,
  onClose,
  onDelete,
}: {
  input: PayrollInput;
  onClose: () => void;
  onDelete: (reason: string) => Promise<void>;
}) {
  const t = useTranslations("Payroll.inputs");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onDelete(reason.trim());
      onClose();
    } catch {
      // Lỗi đã báo bằng toast; giữ hộp thoại.
    } finally {
      setPending(false);
    }
  }

  return (
    <ReasonDialogShell open title={t("deleteTitle")} description={t("deleteDescription", { code: t(`codes.${input.code}`) })} onClose={() => !pending && onClose()}>
      <div className="space-y-1">
        <Label htmlFor="input-delete-reason">{t("reason")}</Label>
        <Textarea id="input-delete-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button variant="destructive" onClick={confirm} disabled={pending || !isValidReason(reason)}>
          {t("delete")}
        </Button>
      </DialogFooter>
    </ReasonDialogShell>
  );
}

function ReasonDialogShell({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Mọi dòng của một nhân viên trong kỳ, kể cả dòng đã bị thay hoặc xóa. */
function HistoryDialog({ month, employeeId, label, onClose }: { month: string; employeeId: string; label: string; onClose: () => void }) {
  const t = useTranslations("Payroll.inputs");
  const query = useInputs(month, employeeId, true);
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("historyTitle")}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {[...query.data]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((row) => (
                <li key={row.id} className="space-y-1 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t(`codes.${row.code}`)}</span>
                    <ValueCell input={row} />
                    {row.adjustSourceMonth && <span className="text-xs text-muted-foreground">{t("sourceMonth")} {row.adjustSourceMonth}</span>}
                    {row.current ? (
                      <Badge variant="success">{t("state.current")}</Badge>
                    ) : row.deletedAt ? (
                      <Badge variant="destructive">{t("state.deleted")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("state.superseded")}</Badge>
                    )}
                  </div>
                  <p>{row.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)} · {displayName(row.createdByName, row.createdBy)}
                    {row.deletedAt && ` · ${t("deletedAt", { at: formatDateTime(row.deletedAt) })}${row.deleteReason ? `: ${row.deleteReason}` : ""}`}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
