"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ChoiceSelect, type Choice } from "@/components/shared/choice-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildIncident, buildIncidentCancellation } from "../incident";
import { useCancelAttendanceIncident, useCreateAttendanceIncident, useTimesheetErrorMessage } from "../hooks";
import type { AttendanceIncident } from "../types";

type Props = {
  incident?: AttendanceIncident;
  offices: Choice[];
  initialOffice: string;
  onDone: (affectedDays: number, cancelled: boolean) => void;
  onClose: () => void;
};

export function IncidentDialog({ incident, offices, initialOffice, onDone, onClose }: Props) {
  const t = useTranslations("Timesheet");
  const errorMessage = useTimesheetErrorMessage("incident");
  const create = useCreateAttendanceIncident();
  const cancel = useCancelAttendanceIncident();
  const [officeId, setOfficeId] = useState(initialOffice || (offices.length === 1 ? offices[0].value : ""));
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const busy = create.isPending || cancel.isPending;
  const draft = incident ? null : buildIncident({ officeId, startAt, endAt, reason });
  const cancellation = incident ? buildIncidentCancellation(incident.id, reason) : null;
  const invalidRange = !!startAt && !!endAt && startAt >= endAt;
  const valid = !!(draft || cancellation);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !valid) return;
    setError("");
    try {
      if (cancellation) {
        const result = await cancel.mutateAsync(cancellation);
        onDone(result.affectedDays, true);
      } else if (draft) {
        const result = await create.mutateAsync(draft);
        onDone(result.affectedDays, false);
      }
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{incident ? t("incidents.cancelTitle") : t("incidents.create")}</DialogTitle>
          <DialogDescription>{incident ? incident.officeName : t("incidents.timeZone")}</DialogDescription>
        </DialogHeader>
        <form id="attendance-incident-form" onSubmit={submit} className="space-y-4">
          {!incident && (
            <>
              <div className="space-y-2">
                <Label htmlFor="incident-office">{t("incidents.office")}</Label>
                <ChoiceSelect id="incident-office" value={officeId} onChange={setOfficeId} choices={offices}
                  placeholder={t("incidents.pickOffice")} disabled={busy} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-start">{t("incidents.start")}</Label>
                <Input id="incident-start" type="datetime-local" value={startAt} disabled={busy}
                  onChange={(event) => setStartAt(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-end">{t("incidents.end")}</Label>
                <Input id="incident-end" type="datetime-local" value={endAt} disabled={busy}
                  onChange={(event) => setEndAt(event.target.value)} required aria-invalid={invalidRange}
                  aria-describedby={invalidRange ? "incident-range-error" : undefined} />
                {invalidRange && <p id="incident-range-error" role="alert" className="text-destructive">{t("errors.invalidIncidentRange")}</p>}
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="incident-reason">{incident ? t("incidents.cancelReason") : t("history.reason")}</Label>
            <Textarea id="incident-reason" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} required />
          </div>
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>{t("adjustment.close")}</Button>
          <Button type="submit" form="attendance-incident-form" variant={incident ? "destructive" : "default"} disabled={busy || !valid}>
            {incident ? t("incidents.confirmCancel") : t("adjustment.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
