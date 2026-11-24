"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime, todayIsoDate } from "@/lib/format";
import { useAttendanceIncidents, useAttendanceOffices, useOwnAttendanceOffice } from "../hooks";
import type { AttendanceIncident } from "../types";
import { IncidentDialog } from "./incident-dialog";

export function IncidentsPage() {
  const t = useTranslations("Timesheet.incidents");
  const { user, hasRole } = useCurrentUser();
  const officeScoped = hasRole("HR") && !hasRole("HR_COMPANY") && !hasRole("ADMIN");
  const [month, setMonth] = useState(() => todayIsoDate().slice(0, 7));
  const [office, setOffice] = useState("");
  const [dialog, setDialog] = useState<"create" | AttendanceIncident | null>(null);
  const [notice, setNotice] = useState<{ affectedDays: number; cancelled: boolean } | null>(null);
  const validMonth = /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month);
  const offices = useAttendanceOffices();
  const ownOffice = useOwnAttendanceOffice(user?.employeeId, officeScoped);
  const incidents = useAttendanceIncidents(validMonth ? month : "", office);
  const choices = (offices.data ?? []).filter(({ id }) => !officeScoped || id === ownOffice.data)
    .map(({ id, name }) => ({ value: id, label: name }));
  const officesPending = offices.isPending || (officeScoped && ownOffice.isPending);

  function onDone(affectedDays: number, cancelled: boolean) {
    setDialog(null);
    setNotice({ affectedDays, cancelled });
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} actions={
        <Button onClick={() => { setNotice(null); setDialog("create"); }} disabled={!choices.length}>
          <PlusIcon /> {t("create")}
        </Button>
      } />
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="incidents-month">{t("month")}</Label>
          <Input id="incidents-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <div className="min-w-48 space-y-2">
          <Label htmlFor="incidents-office">{t("office")}</Label>
          <ChoiceSelect id="incidents-office" value={office} onChange={setOffice} choices={choices}
            noneLabel={t("allOffices")} disabled={officesPending} />
        </div>
      </div>
      {notice && <p role="status" className="rounded-lg border p-3 text-sm">{t(notice.cancelled ? "cancelledNotice" : "createdNotice", { days: notice.affectedDays })}</p>}
      {offices.isError && <ErrorState error={offices.error} onRetry={() => offices.refetch()} />}
      {officeScoped && ownOffice.isError && <ErrorState error={ownOffice.error} onRetry={() => ownOffice.refetch()} />}
      {offices.isSuccess && (!officeScoped || ownOffice.isSuccess) && !choices.length && <p className="text-sm text-muted-foreground">{t("noOffices")}</p>}
      {!validMonth ? <EmptyState title={t("pickMonth")} />
        : incidents.isPending ? <LoadingState />
        : incidents.isError ? <ErrorState error={incidents.error} onRetry={() => incidents.refetch()} />
        : !incidents.data.length ? <EmptyState title={t("empty")} />
        : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("office")}</TableHead>
                  <TableHead>{t("start")}</TableHead>
                  <TableHead>{t("end")}</TableHead>
                  <TableHead>{t("reason")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("createdBy")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.data.map((incident) => {
                  const cancelled = incident.status === "CANCELLED";
                  return (
                    <TableRow key={incident.id}>
                      <TableCell>{incident.officeName}</TableCell>
                      <TableCell>{formatDateTime(incident.startAt)}</TableCell>
                      <TableCell>{formatDateTime(incident.endAt)}</TableCell>
                      <TableCell className="min-w-40 whitespace-normal wrap-break-word">{incident.reason}</TableCell>
                      <TableCell>
                        <Badge variant={cancelled ? "secondary" : "warning"}>{t(cancelled ? "statuses.CANCELLED" : "statuses.ACTIVE")}</Badge>
                        {cancelled && incident.cancelReason && (
                          <p className="mt-1 max-w-80 whitespace-normal wrap-break-word text-xs text-muted-foreground">
                            {t("cancelReasonValue", { reason: incident.cancelReason })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {incident.createdByName ?? "—"}
                        <div className="text-xs text-muted-foreground">{formatDateTime(incident.createdAt)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!cancelled && (
                          <Button variant="outline" size="sm" onClick={() => { setNotice(null); setDialog(incident); }}>
                            {t("cancel")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      {dialog && (
        <IncidentDialog incident={dialog === "create" ? undefined : dialog} offices={choices}
          initialOffice={office} onDone={onDone} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
